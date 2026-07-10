"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  Loader2,
  Brain,
  ArrowRight,
  Info,
} from "lucide-react";

import { SubjectSelector } from "@/components/SubjectSelector";

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

type Status = "idle" | "uploading" | "processing" | "complete" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [examType, setExamType] = useState("Mixed");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const handleEvaluate = async () => {
    if (!file || !subject || !grade) return;

    setStatus("uploading");
    setError("");

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise((r) => setTimeout(r, 200));
      setProgress(i);
    }

    try {
      // Create evaluation record
      const uploadRes = await fetch("/api/evaluate/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          grade,
          examType,
          fileName: file.name,
        }),
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { evaluationId: id } = await uploadRes.json();
      setEvaluationId(id);

      // Process with AI
      setStatus("processing");

      const processRes = await fetch("/api/evaluate/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId: id }),
      });

      if (!processRes.ok) {
        const err = await processRes.json();
        throw new Error(err.error || "Processing failed");
      }

      setStatus("complete");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-poppins)" }}>
          New Evaluation
        </h1>
        <p className="text-gray-500">Upload your answer sheet and let AI evaluate it instantly</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-3 space-y-5">
          {/* Dropzone */}
          <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
              Upload Answer Sheet
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
                <p className="text-gray-700 font-semibold mb-1">
                  {isDragActive ? "Drop your file here!" : "Drag & drop or click to upload"}
                </p>
                <p className="text-gray-400 text-sm">Supports PDF, PNG, JPG, JPEG (max 10MB)</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{file.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
              Evaluation Settings
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              <SubjectSelector
                id="subject-select"
                value={subject}
                onChange={setSubject}
                placeholder="Select or type subject..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade/Level *</label>
              <select
                id="grade-select"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
              <div className="grid grid-cols-3 gap-2">
                {["MCQ", "Descriptive", "Mixed"].map((type) => (
                  <label
                    key={type}
                    className={`flex items-center justify-center py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                      examType === type
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
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
          <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
              Evaluation Status
            </h2>

            {/* Steps */}
            <div className="space-y-4 mb-6">
              {[
                {
                  label: "Upload File",
                  done: !!file,
                  active: status === "uploading",
                },
                {
                  label: "Configure Settings",
                  done: !!(file && subject && grade),
                  active: false,
                },
                {
                  label: "AI Processing",
                  done: status === "complete",
                  active: status === "processing",
                },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      step.done
                        ? "bg-green-100 text-green-600"
                        : step.active
                        ? "gradient-primary text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {step.done ? <CheckCircle className="w-4 h-4" /> : step.active ? <Loader2 className="w-3 h-3 animate-spin" /> : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step.done
                        ? "text-green-600"
                        : step.active
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            {status === "uploading" && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {status === "processing" && (
              <div className="bg-blue-50 rounded-xl p-4 mb-5 flex items-center gap-3">
                <Brain className="w-5 h-5 text-blue-500 animate-pulse" />
                <p className="text-sm text-blue-700 font-medium">
                  AI is evaluating your answers...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {status === "complete" ? (
              <div>
                <div className="bg-green-50 rounded-xl p-4 mb-5 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Evaluation Complete!</p>
                  <p className="text-xs text-green-600 mt-0.5">Your results are ready</p>
                </div>
                <button
                  id="view-results"
                  onClick={() => router.push(`/evaluation/${evaluationId}`)}
                  className="w-full gradient-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  View Results <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="start-evaluation"
                onClick={handleEvaluate}
                disabled={!file || !subject || !grade || status !== "idle"}
                className="w-full gradient-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === "idle" ? (
                  <>
                    <Brain className="w-4 h-4" />
                    Start AI Evaluation
                  </>
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </button>
            )}

            <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p>Uses 1 evaluation credit. Free plan includes 10 credits.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
