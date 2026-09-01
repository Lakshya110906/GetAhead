"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDropzone } from "react-dropzone";
import { upload } from "@vercel/blob/client";
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  Loader2,
  Brain,
  ArrowRight,
  Info,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { SubjectSelector } from "@/components/SubjectSelector";
import { SharedQuotaBadge } from "@/components/SharedQuotaBadge";

const grades = [
  "8th Grade",
  "9th Grade",
  "10th Grade (CBSE/ICSE)",
  "11th Grade",
  "12th Grade",
  "Undergraduate",
  "Postgraduate",
  "Competitive Exam",
];

// idle -> uploading (direct-to-storage) -> queued -> processing -> succeeded | failed | cancelled
type Status = "idle" | "uploading" | "queued" | "processing" | "succeeded" | "failed" | "cancelled" | "quota_exceeded" | "maintenance";

const POLL_INTERVALS_MS = [1000, 1500, 2000, 3000, 4000, 6000, 8000];

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export default function UploadPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [examType, setExamType] = useState("Mixed");
  const [status, setStatus] = useState<Status>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [quotaResetsAt, setQuotaResetsAt] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  // A failure whose cause is the uploaded file itself (not an answer sheet
  // at all) will fail identically no matter how many times it's retried
  // with that same file — the "Retry evaluation" button must not be
  // offered as if it might work this time. Matches paper generation's
  // retryWorthwhile, which this evaluation flow never had.
  const [retryWorthwhile, setRetryWorthwhile] = useState(true);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIndexRef = useRef(0);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  });

  const pollJob = useCallback(
    (id: string) => {
      const poll = async () => {
        try {
          const res = await fetch(`/api/evaluations/${id}`);
          const data = await res.json();

          if (!res.ok) {
            setStatus("failed");
            setError(data.error || "Couldn't check the evaluation's status.");
            return;
          }

          setAttempts(data.attempts ?? 0);
          setMaxAttempts(data.maxAttempts ?? 3);

          if (data.status === "SUCCEEDED") {
            setStatus("succeeded");
            setTimeout(() => router.push(`/evaluation/${id}`), 600);
            return;
          }
          if (data.status === "FAILED") {
            setStatus("failed");
            setError(data.lastError || "The evaluation failed after multiple attempts.");
            setRetryWorthwhile(data.retryWorthwhile ?? true);
            return;
          }
          if (data.status === "CANCELLED") {
            setStatus("cancelled");
            return;
          }

          setStatus(data.status === "PROCESSING" ? "processing" : "queued");

          const i = Math.min(pollIndexRef.current, POLL_INTERVALS_MS.length - 1);
          pollIndexRef.current += 1;
          pollTimeoutRef.current = setTimeout(poll, POLL_INTERVALS_MS[i]);
        } catch {
          // Transient network hiccup while polling — keep trying on the same
          // backoff schedule rather than surfacing an error for one dropped check.
          const i = Math.min(pollIndexRef.current, POLL_INTERVALS_MS.length - 1);
          pollIndexRef.current += 1;
          pollTimeoutRef.current = setTimeout(poll, POLL_INTERVALS_MS[i]);
        }
      };
      poll();
    },
    [router]
  );

  const handleEvaluate = async () => {
    if (!file || !subject || !grade) return;

    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      setStatus("failed");
      setError("Your session isn't ready yet — try again in a moment.");
      return;
    }

    setStatus("uploading");
    setError("");
    setUploadProgress(0);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const contentType = MIME_BY_EXT[ext] || file.type;

      // @vercel/blob's handleUpload doesn't actually let the server rewrite
      // this path — despite onBeforeGenerateToken appearing to return one,
      // the SDK's own token-generation call spreads the client-requested
      // pathname back in afterward, silently overriding it (confirmed
      // against @vercel/blob 2.6.1 and 2.8.0, both have this). The real
      // per-user namespacing has to come from the client requesting the
      // correctly-prefixed path itself; /api/uploads now enforces (not
      // rewrites) that this prefix actually matches the caller's real,
      // server-verified session — a client can request its own prefix
      // here, but not anyone else's.
      const blob = await upload(`answer-sheets/${userId}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/uploads",
        contentType,
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      });

      setStatus("queued");

      const enqueueRes = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: blob.url,
          fileKey: blob.pathname,
          fileName: file.name,
          fileSize: file.size,
          fileType: contentType,
          subject,
          grade,
          examType,
        }),
      });

      const enqueueData = await enqueueRes.json();
      if (!enqueueRes.ok) {
        if (enqueueData.quotaExceeded) {
          setQuotaResetsAt(enqueueData.resetsAt || null);
          setStatus("quota_exceeded");
          setError(enqueueData.error);
          return;
        }
        if (enqueueData.maintenance) {
          setStatus("maintenance");
          setError(enqueueData.error);
          return;
        }
        throw new Error(enqueueData.error || "Couldn't queue the evaluation.");
      }

      setJobId(enqueueData.jobId);
      pollIndexRef.current = 0;
      pollJob(enqueueData.jobId);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "The upload didn't complete. Check your connection and try again.");
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    try {
      const res = await fetch(`/api/evaluations/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        // Couldn't cancel (e.g. it started processing the instant before) — resume polling for the real outcome.
        pollJob(jobId);
        return;
      }
      setStatus("cancelled");
    } catch {
      pollJob(jobId);
    }
  };

  const handleRetry = async () => {
    if (!jobId) return;
    setError("");
    try {
      const res = await fetch(`/api/evaluations/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't retry this evaluation. Start a new one instead.");
        return;
      }
      pollIndexRef.current = 0;
      setStatus("queued");
      pollJob(jobId);
    } catch {
      setError("Couldn't reach the server to retry. Check your connection and try again.");
    }
  };

  const handleStartOver = () => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    setFile(null);
    setStatus("idle");
    setJobId(null);
    setError("");
    setUploadProgress(0);
  };

  const isBusy = status === "uploading" || status === "queued" || status === "processing";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1" style={{ fontFamily: "var(--font-display)" }}>
          New evaluation
        </h1>
        <p className="text-graphite">See exactly where every mark is won or lost — upload a sheet to begin.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-3 space-y-5">
          {/* Dropzone */}
          <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
            <h2 className="text-lg font-bold text-ink mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Upload answer sheet
            </h2>

            {!file ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7 text-blue-500" />
                </div>
                <p className="text-ink font-semibold mb-1">
                  {isDragActive ? "Drop your file here!" : "Drag & drop or click to upload"}
                </p>
                <p className="text-gray-400 text-sm">Supports PDF (up to 25 pages), PNG, JPG, JPEG (max 20MB)</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center shadow-sm">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm truncate">{file.name}</p>
                  <p className="text-graphite text-xs mt-0.5 font-mono tabular-nums">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!isBusy && (
                  <button
                    onClick={() => setFile(null)}
                    aria-label="Remove file"
                    className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6 space-y-5">
            <h2 className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
              Evaluation settings
            </h2>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">Subject *</label>
              <SubjectSelector
                id="subject-select"
                value={subject}
                onChange={setSubject}
                placeholder="Select or type subject..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">Grade/level *</label>
              <select
                id="grade-select"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-surface"
              >
                <option value="">Select grade...</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">Exam type</label>
              <div className="grid grid-cols-3 gap-2">
                {["MCQ", "Descriptive", "Mixed"].map((type) => (
                  <label
                    key={type}
                    className={`flex items-center justify-center py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                      examType === type
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-graphite hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="examType"
                      value={type}
                      checked={examType === type}
                      onChange={() => setExamType(type)}
                      className="hidden"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="lg:col-span-2">
          <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6 sticky top-6">
            <h2 className="text-lg font-bold text-ink mb-5" style={{ fontFamily: "var(--font-display)" }}>
              Evaluation status
            </h2>

            {/* Steps — same circled-mark convention as the report's margin
                marks: a mono numeral until a step resolves, then a tick. */}
            <div className="space-y-4 mb-6">
              {[
                {
                  label: "Upload file",
                  done: status !== "idle" && status !== "uploading",
                  active: status === "uploading",
                },
                {
                  label: "Queued",
                  done: status === "processing" || status === "succeeded",
                  active: status === "queued",
                },
                {
                  label: "AI evaluation",
                  done: status === "succeeded",
                  active: status === "processing",
                },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 border ${
                      step.done
                        ? "bg-green-100 text-green-600 border-transparent"
                        : step.active
                        ? "bg-ink text-paper border-transparent"
                        : "bg-transparent text-gray-400 border-gray-200"
                    }`}
                  >
                    {step.done ? <CheckCircle className="w-4 h-4" /> : step.active ? <Loader2 className="w-3 h-3 animate-spin" /> : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step.done ? "text-green-600" : step.active ? "text-blue-600" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Uploading: direct-to-storage progress */}
            {status === "uploading" && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-graphite mb-1.5">
                  <span>Uploading...</span>
                  <span className="font-mono tabular-nums">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fixed-ink rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Queued: distinct state, distinct copy */}
            {status === "queued" && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-800 font-medium">
                  Your sheet is in the queue — evaluation will start shortly.
                </p>
              </div>
            )}

            {/* Processing: distinct state, distinct copy */}
            {status === "processing" && (
              <div className="bg-blue-50 rounded-xl p-4 mb-5 flex items-center gap-3">
                <Brain className="w-5 h-5 text-blue-500 animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">AI is reading and grading your answer sheet...</p>
                  {attempts > 1 && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      Retrying — attempt <span className="font-mono tabular-nums">{attempts}</span> of{" "}
                      <span className="font-mono tabular-nums">{maxAttempts}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {status === "cancelled" && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-graphite">Evaluation cancelled. No credit was used.</p>
              </div>
            )}

            {status === "failed" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      {!retryWorthwhile ? "This file can't be evaluated" : attempts >= maxAttempts ? `Evaluation failed after ${maxAttempts} attempts` : "Evaluation failed"}
                    </p>
                    <p className="text-sm text-red-700 mt-0.5">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {status === "quota_exceeded" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Daily evaluation limit reached</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      You&apos;ve used today&apos;s free evaluations.
                      {quotaResetsAt && ` Resets ${new Date(quotaResetsAt).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status === "maintenance" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Evaluations are paused for today</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      We&apos;ve hit our daily processing limit to keep the service running smoothly. Please try again tomorrow.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status === "succeeded" ? (
              <div>
                <div className="bg-green-50 rounded-xl p-4 mb-5 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Evaluation complete!</p>
                  <p className="text-xs text-green-600 mt-0.5">Taking you to your results...</p>
                </div>
                <button
                  id="view-results"
                  onClick={() => jobId && router.push(`/evaluation/${jobId}`)}
                  className="w-full bg-ink text-paper font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  View results <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : status === "failed" ? (
              <div className="space-y-2">
                {retryWorthwhile && (
                  <button
                    onClick={handleRetry}
                    className="w-full bg-ink text-paper font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Retry evaluation
                  </button>
                )}
                <button
                  onClick={handleStartOver}
                  className={`w-full font-semibold py-3 rounded-xl transition-colors ${
                    retryWorthwhile
                      ? "border border-gray-200 text-graphite hover:bg-gray-50"
                      : "bg-ink text-paper hover:opacity-90"
                  }`}
                >
                  Upload a different file
                </button>
              </div>
            ) : status === "cancelled" ? (
              <button
                onClick={handleStartOver}
                className="w-full bg-ink text-paper font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Start a new evaluation
              </button>
            ) : status === "quota_exceeded" || status === "maintenance" ? (
              <button
                disabled
                className="w-full bg-surface-2 text-gray-400 font-semibold py-3 rounded-xl cursor-not-allowed"
              >
                {status === "quota_exceeded" ? "Come back after your limit resets" : "Come back tomorrow"}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  id="start-evaluation"
                  onClick={handleEvaluate}
                  disabled={!file || !subject || !grade || isBusy}
                  className="w-full bg-ink text-paper font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === "idle" ? (
                    <>
                      <Brain className="w-4 h-4" />
                      Start AI evaluation
                    </>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                </button>
                {(status === "queued" || status === "processing") && (
                  <button
                    onClick={handleCancel}
                    className="w-full border border-gray-200 text-graphite font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                    disabled={status === "processing"}
                  >
                    Cancel
                  </button>
                )}
                {status === "idle" && <SharedQuotaBadge />}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p>Uses 1 evaluation credit. Free during beta — 10 evaluations per day, resetting daily.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
