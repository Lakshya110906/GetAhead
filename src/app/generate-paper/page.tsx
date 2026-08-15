"use client";

import { useState, useRef, useEffect } from "react";
import {
  GraduationCap,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  Printer,
  Copy,
  CheckCircle,
  Check,
  Eye,
  Settings,
  ArrowLeft,
  Search,
  PenLine,
  Upload,
  X,
  Sparkles,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { GeneratedPaper } from "@/lib/question-agents";
import { SubjectSelector } from "@/components/SubjectSelector";
import { SharedQuotaBadge } from "@/components/SharedQuotaBadge";
import { computeTimeAllowed } from "@/lib/timeAllowed";
import { buildUserFacingValidationMessage } from "@/lib/paperUserMessages";

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

// ─── Types ───────────────────────────────────────────────────────────────────
type GenerationStatus = "idle" | "generating" | "complete" | "error" | "quota_exceeded" | "maintenance" | "stuck" | "connection_lost";
type AgentStatus = "idle" | "active" | "done" | "error";

interface ConflictInfo {
  message: string;
  impliedTotal: number | null;
  fieldTotal: number;
  typeConflict: boolean;
  impliedQuestionTypes: string[] | null;
  fieldQuestionTypes: string[];
}

interface RepairAttemptLog {
  attempt: number;
  violations: string[];
}

interface AgentLogEntry {
  type: "log" | "tool_call" | "tool_result" | "done";
  message: string;
  query?: string;
  ts: number;
}

const SUBSCRIPT_DIGITS: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const SUPERSCRIPT_DIGITS: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

// The AI occasionally emits raw LaTeX-ish math markup ($H_2O$, \times, \rightarrow,
// literal "\n") instead of plain text — there's no LaTeX renderer in this app, so
// left as-is it shows dollar signs and backslash commands verbatim on the printed
// paper. This converts the common subset to plain/unicode text instead.
function cleanMathText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\\n/g, " ")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\leftarrow/g, "←")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\pm/g, "±")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\sqrt\{([^}]*)\}/g, "√($1)")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2")
    .replace(/[_^]\{(-?[0-9]+)\}/g, (_m, digits: string, offset: number, full: string) => {
      const isSuper = full[offset - 1] === "^";
      const map = isSuper ? SUPERSCRIPT_DIGITS : SUBSCRIPT_DIGITS;
      return digits.replace(/-|[0-9]/g, (d) => (d === "-" ? "" : map[d] ?? d));
    })
    .replace(/[_^]([0-9])/g, (m, digit: string) => (m[0] === "^" ? SUPERSCRIPT_DIGITS[digit] : SUBSCRIPT_DIGITS[digit]) ?? m)
    .replace(/\$/g, "")
    .replace(/^[A-D]\)\s*/, "")
    .trim();
}

// ─── AgentCard component ─────────────────────────────────────────────────────
const ACCENT: Record<string, { badge: string; glow: string; ring: string; dot: string; border: string; bg: string; text: string }> = {
  blue:   { badge: "bg-blue-100 text-blue-700",    glow: "shadow-blue-500/20",   ring: "ring-blue-500", dot: "bg-blue-500",   border: "border-blue-100", bg: "bg-blue-50", text: "text-blue-700" },
  indigo: { badge: "bg-indigo-100 text-indigo-700", glow: "shadow-indigo-500/20", ring: "ring-indigo-500", dot: "bg-indigo-500", border: "border-indigo-100", bg: "bg-indigo-50", text: "text-indigo-700" },
  purple: { badge: "bg-purple-100 text-purple-700", glow: "shadow-purple-500/20", ring: "ring-purple-500", dot: "bg-purple-500", border: "border-purple-100", bg: "bg-purple-50", text: "text-purple-700" },
};

function AgentCard({
  icon: Icon, name, role, status, logs, accentColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  role: string;
  status: AgentStatus;
  logs: AgentLogEntry[];
  accentColor: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const c = ACCENT[accentColor] ?? ACCENT.blue;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`rounded-2xl border ${c.border} bg-surface shadow-md ${status === "active" ? `shadow-lg ${c.glow}` : ""} transition-all duration-500 overflow-hidden flex flex-col`}>
      {/* Card header */}
      <div className={`px-4 py-3 flex items-start gap-3 ${c.bg} border-b ${c.border}`}>
        <Icon className={`w-5 h-5 mt-0.5 ${c.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: "var(--font-display)" }}>{name}</p>
            {status === "active" && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
                Running
              </span>
            )}
            {status === "done" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" />
                Done
              </span>
            )}
            {status === "idle" && (
              <span className="text-xs font-medium text-gray-400 px-2 py-0.5 rounded-full bg-surface-2">Waiting</span>
            )}
          </div>
          <p className="text-xs text-graphite mt-0.5 truncate">{role}</p>
        </div>
      </div>
      {/* Log feed */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[160px] max-h-[200px] overflow-y-auto p-3 space-y-1.5 bg-gray-950 scrollbar-thin"
      >
        {logs.length === 0 && status === "idle" && (
          <p className="text-graphite text-xs italic text-center mt-8">Waiting for activation...</p>
        )}
        {logs.map((entry, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-graphite text-xs font-mono shrink-0 mt-px">›</span>
            {entry.type === "tool_call" && (
              <span className="text-xs font-mono inline-flex items-center gap-1">
                <Search className="w-3 h-3 text-yellow-400 inline-block" />
                <span className="text-yellow-300">{entry.message}</span>
              </span>
            )}
            {entry.type === "tool_result" && (
              <span className="text-xs font-mono inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-green-400 inline-block" />
                <span className="text-green-300">{entry.message}</span>
              </span>
            )}
            {entry.type === "done" && (
              <span className="text-xs font-mono inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-blue-400 inline-block" />
                <span className="text-blue-200 font-semibold">{entry.message}</span>
              </span>
            )}
            {entry.type === "log" && (
              <span className="text-gray-300 text-xs font-mono">{entry.message}</span>
            )}
          </div>
        ))}
        {status === "active" && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-graphite text-xs font-mono">›</span>
            <span className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GeneratePaperPage() {
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [totalMarks, setTotalMarks] = useState(30);
  const [questionTypes, setQuestionTypes] = useState<string[]>(["MCQ", "Short Answer"]);
  
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState("");
  const [quotaResetsAt, setQuotaResetsAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Editing a question or metadata field autosaves in the background —
  // failure used to be console.error only, so a user who edited a
  // question, saw it update on screen, and closed the tab had no idea the
  // edit never actually reached the database. Surfaced as a dismissible
  // banner instead.
  const [autosaveError, setAutosaveError] = useState(false);

  // Conflict resolution (structured field vs. parsed custom-instruction constraint)
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  // Failure UX detail: why it failed, whether the quota credit was refunded,
  // and whether retrying is worth it — so a failure is never just "Something
  // went wrong" with no next step.
  const [quotaRefunded, setQuotaRefunded] = useState(false);
  const [retryWorthwhile, setRetryWorthwhile] = useState(true);
  const [repairAttemptLogs, setRepairAttemptLogs] = useState<RepairAttemptLog[] | null>(null);
  // Job-based generation state — generation now runs as a durable, pollable
  // job (see /api/papers) instead of holding one long-lived streamed
  // connection open, which is what got killed by Vercel's function timeout
  // in production ("Task timed out after 120 seconds"). jobId lets Cancel
  // and the poll loop address the same row; pollTimer/noProgressSince back
  // the client-side stuck-job timeout, which previously did not exist at
  // all (a dead server-side stream just spun the UI forever).
  const [jobId, setJobId] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef<number>(Date.now());
  const lastStepRef = useRef<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // Backoff + ceiling state for the poll loop (section 3/4 of the connection
  // fix): consecutive network/gateway failures grow the delay before the
  // next attempt and, past a ceiling, stop and tell the user honestly rather
  // than silently retrying forever OR immediately declaring the job dead —
  // a 504 on the poll means "couldn't reach the server that moment," not
  // "the job failed." The job itself may still be running fine.
  const consecutivePollFailuresRef = useRef(0);
  const pollAttemptCountRef = useRef(0);

  // Custom Paper Style & Study Material Upload
  const [customPrompt, setCustomPrompt] = useState("");
  const [studyMaterialText, setStudyMaterialText] = useState("");
  const [studyMaterialFileName, setStudyMaterialFileName] = useState("");
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Agent live activity
  const [plannerStatus, setPlannerStatus] = useState<AgentStatus>("idle");
  const [generatorStatus, setGeneratorStatus] = useState<AgentStatus>("idle");
  const [reviewerStatus, setReviewerStatus] = useState<AgentStatus>("idle");
  const [plannerLogs, setPlannerLogs] = useState<AgentLogEntry[]>([]);
  const [generatorLogs, setGeneratorLogs] = useState<AgentLogEntry[]>([]);
  const [reviewerLogs, setReviewerLogs] = useState<AgentLogEntry[]>([]);
  
  // Results
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [paperDbId, setPaperDbId] = useState<string | null>(null);
  const [plannerPlan, setPlannerPlan] = useState<unknown | null>(null);
  const [generatorDraft, setGeneratorDraft] = useState<unknown | null>(null);
  const [viewMode, setViewMode] = useState<"paper" | "answers" | "logs">("paper");

  // Editing state for manual tweaks
  const [editingIndex, setEditingIndex] = useState<{ sIdx: number; qIdx: number } | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionMarks, setEditQuestionMarks] = useState<number>(0);
  const [editQuestionAnswer, setEditQuestionAnswer] = useState("");
  const [editQuestionOptions, setEditQuestionOptions] = useState<string[]>([]);

  // AI Refinement feedback state
  const [aiFeedback, setAiFeedback] = useState("");
  
  // Printable Exam Metadata
  const [institutionName, setInstitutionName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [timeAllowed, setTimeAllowed] = useState(() => computeTimeAllowed(30));
  const [timeAllowedTouched, setTimeAllowedTouched] = useState(false);
  const [instructions, setInstructions] = useState("1. All questions are compulsory.\n2. Write your Candidate Name and Roll Number clearly at the top right.");

  // Time allowed must track total marks, not sit at a fixed default — but
  // once the user has typed their own value, stop overwriting it.
  useEffect(() => {
    if (!timeAllowedTouched) setTimeAllowed(computeTimeAllowed(totalMarks));
  }, [totalMarks, timeAllowedTouched]);

  const handleTypeChange = (type: string) => {
    if (questionTypes.includes(type)) {
      if (questionTypes.length > 1) {
        setQuestionTypes(questionTypes.filter((t) => t !== type));
      }
    } else {
      setQuestionTypes([...questionTypes, type]);
    }
  };

  const handleStudyMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMaterial(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-material", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to extract material");
      }

      const data = await res.json();
      if (data.success) {
        setStudyMaterialText(data.text);
        setStudyMaterialFileName(data.fileName);
      } else {
        throw new Error(data.error || "Failed to extract text from document");
      }
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : "Error processing file.");
    } finally {
      setUploadingMaterial(false);
    }
  };

  const clearStudyMaterial = () => {
    setStudyMaterialText("");
    setStudyMaterialFileName("");
    setUploadError("");
  };

  const addLog = (agent: "planner" | "generator" | "reviewer" | "repair", entry: Omit<AgentLogEntry, "ts">) => {
    const full: AgentLogEntry = { ...entry, ts: Date.now() };
    if (agent === "planner") setPlannerLogs(p => [...p, full]);
    else if (agent === "generator") setGeneratorLogs(p => [...p, full]);
    // "repair" events (validation attempts / re-prompts) surface on the
    // Reviewer card — validating and repairing the paper against the
    // request is part of the same quality-audit stage from the user's
    // point of view.
    else setReviewerLogs(p => [...p, full]);
  };

  // Generation runs as a durable job (POST creates it, GET polls and drives
  // it forward) rather than one held-open streamed connection — that
  // connection is exactly what got killed in production ("Task timed out
  // after 120 seconds") with three sequential Gemini calls plus a repair
  // loop inside it. Polling also gets us a real client-side timeout for
  // free: a streamed connection that silently dies gives the client nothing
  // to react to, which is why the UI used to spin forever.
  const NO_PROGRESS_TIMEOUT_MS = 90_000;
  const POLL_INTERVAL_MS = 2000;
  const POLL_INTERVAL_MAX_MS = 8000;
  const MAX_CONSECUTIVE_POLL_FAILURES = 5; // ~1+2+4+8+8s of backoff before giving up
  const MAX_POLL_ATTEMPTS = 300; // hard ceiling — at ~2-8s/poll this is comfortably longer than NO_PROGRESS_TIMEOUT_MS would ever allow anyway, but never poll literally forever

  const agentRunState = (s: string | undefined): AgentStatus =>
    s === "running" ? "active" : s === "done" ? "done" : s === "failed" ? "error" : "idle";

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Synthesizes the same per-agent log lines the old SSE stream produced,
  // from the job's persisted step transitions — the agent cards' shape and
  // meaning are unchanged, only their source of truth is.
  const STEP_LOG: Record<string, { agent: "planner" | "generator" | "reviewer" | "repair"; message: string }> = {
    planner: { agent: "planner", message: "Planner Agent activated. Structuring the paper..." },
    generator: { agent: "generator", message: "Generator Agent activated. Drafting questions, answers, and mark schemes..." },
    reviewer: { agent: "reviewer", message: "Quality Reviewer Agent activated. Auditing the draft..." },
    validate: { agent: "repair", message: "Validating the paper against your exact request..." },
    repair: { agent: "repair", message: "Validation found issues — re-prompting to fix them specifically..." },
    done: { agent: "repair", message: "Done." },
  };

  // Nudges the job forward — a real Gemini call may live behind this
  // request, so it is NEVER awaited by anything the UI depends on to
  // update. Fire-and-forget: if it's slow, times out, or the network drops
  // it, the next read poll just sees whatever state existed before it,
  // which is correct (not stale-in-a-harmful-way) rather than blocking.
  const triggerAdvance = (id: string) => {
    fetch(`/api/papers/${id}/advance`, { method: "POST" }).catch(() => {
      // Deliberately silent — this is a nudge, not a read the UI depends on.
      // If it fails, the row simply doesn't move this cycle; the next poll
      // (or another tab, or the daily cron) tries again.
    });
  };

  const pollJob = async (id: string) => {
    // Don't poll a hidden tab — a fixed-interval poll from a background tab
    // the user isn't looking at is pure waste against a free-tier database
    // and a shared Gemini quota. Resumes automatically on visibilitychange
    // (see the effect below) rather than losing the loop entirely.
    if (typeof document !== "undefined" && document.hidden) {
      pollTimerRef.current = setTimeout(() => pollJob(id), POLL_INTERVAL_MS);
      return;
    }

    pollAttemptCountRef.current += 1;
    if (pollAttemptCountRef.current > MAX_POLL_ATTEMPTS) {
      stopPolling();
      setError("This generation has been running for an unusually long time. It may still finish in the background — check back later, or start a new one.");
      setStatus("stuck");
      return;
    }

    triggerAdvance(id);

    try {
      const res = await fetch(`/api/papers/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("This generation job could not be found — it may have expired.");
          setStatus("error");
          return;
        }
        // A 504/502/etc. here means "couldn't reach the server that
        // moment" — it does NOT mean the job failed. The job keeps running
        // server-side regardless of whether this particular poll landed.
        // Treated as a transient network condition: back off and retry:
        // only surface a distinct "connection lost" state (never
        // "Generation Failed") after several consecutive misses.
        throw new Error(`poll_http_${res.status}`);
      }
      consecutivePollFailuresRef.current = 0;
      const view = await res.json();

      // Step transitions drive both the log stream and the stuck-job timer.
      if (view.step !== lastStepRef.current) {
        lastStepRef.current = view.step;
        lastProgressRef.current = Date.now();
        const entry = STEP_LOG[view.step as string];
        if (entry) addLog(entry.agent, { type: "log", message: entry.message });
      }

      setPlannerStatus(agentRunState(view.agentStates?.planner?.status));
      setGeneratorStatus(agentRunState(view.agentStates?.generator?.status));
      setReviewerStatus(agentRunState(view.agentStates?.reviewer?.status));

      if (view.status === "succeeded") {
        stopPolling();
        setPlannerStatus("done"); setGeneratorStatus("done"); setReviewerStatus("done");
        addLog("repair", { type: "done", message: "Review complete. Paper validated against your request." });
        setPaper(view.paper);
        setPaperDbId(view.savedPaperId);
        setRepairAttemptLogs(view.repairAttempts || null);
        setStatus("complete");
        return;
      }

      if (view.status === "failed") {
        stopPolling();
        if (view.quotaRefunded) setQuotaRefunded(true);
        if (view.retryWorthwhile === false) setRetryWorthwhile(false);
        if (view.repairAttempts) setRepairAttemptLogs(view.repairAttempts);
        setError(view.error || "Generation failed.");
        setStatus("error");
        return;
      }

      if (view.status === "cancelled") {
        stopPolling();
        setStatus("idle");
        return;
      }

      // Still queued/running — client-side timeout: if nothing has actually
      // moved forward (no step change, no status change) in a while, this
      // is exactly the "stuck generation" case that used to be a dead end.
      // Tell the user instead of spinning forever.
      if (Date.now() - lastProgressRef.current > NO_PROGRESS_TIMEOUT_MS) {
        stopPolling();
        setError(
          "This is taking much longer than expected and doesn't seem to be making progress. It may still finish in the background — you can wait and refresh, or cancel and try again."
        );
        setStatus("stuck");
        return;
      }

      pollTimerRef.current = setTimeout(() => pollJob(id), POLL_INTERVAL_MS);
    } catch (err) {
      // Network failure or a non-JSON/gateway error response — distinct
      // from a job that actually failed. Back off exponentially and keep
      // trying; only give up (with a state that says "connection," never
      // "Generation Failed") after several consecutive misses in a row.
      consecutivePollFailuresRef.current += 1;
      console.error("Poll attempt failed:", err);

      if (consecutivePollFailuresRef.current >= MAX_CONSECUTIVE_POLL_FAILURES) {
        stopPolling();
        setError(
          "Lost connection while checking on your generation. The job itself may still be running fine server-side — reconnecting will show its real state, not restart it."
        );
        setStatus("connection_lost");
        return;
      }

      const backoff = Math.min(POLL_INTERVAL_MAX_MS, POLL_INTERVAL_MS * Math.pow(2, consecutivePollFailuresRef.current));
      pollTimerRef.current = setTimeout(() => pollJob(id), backoff);
    }
  };

  const handleGenerate = async (e: React.FormEvent, conflictResolution?: "useImplied" | "useField") => {
    e.preventDefault();
    if (!subject || !grade || !topic || questionTypes.length === 0) {
      setError("Please fill in all required fields and select at least one question type.");
      return;
    }

    setError("");
    setConflictInfo(null);
    setQuotaRefunded(false);
    setRetryWorthwhile(true);
    setRepairAttemptLogs(null);
    setStatus("generating");
    setPaper(null);
    setJobId(null);
    lastStepRef.current = null;
    lastProgressRef.current = Date.now();
    consecutivePollFailuresRef.current = 0;
    pollAttemptCountRef.current = 0;
    setPlannerStatus("idle"); setGeneratorStatus("idle"); setReviewerStatus("idle");
    setPlannerLogs([]); setGeneratorLogs([]); setReviewerLogs([]);

    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, grade, topic, difficulty, totalMarks, questionTypes,
          customPrompt, studyMaterialText,
          ...(conflictResolution ? { conflictResolution } : {}),
        }),
      });

      // A platform-level failure (e.g. a function timeout) returns a body
      // that isn't our JSON at all — that parse failure is itself
      // meaningful (it means something killed the request before our code
      // could even respond), not something to silently paper over.
      let body: Record<string, unknown> = {};
      let bodyParseFailed = false;
      try {
        body = await res.json();
      } catch {
        bodyParseFailed = true;
      }

      if (!res.ok) {
        if (res.status === 409 && body.conflict) {
          // Your instructions disagree with the structured fields — never
          // silently pick one. Surface the conflict and let the user choose.
          setConflictInfo({
            message: body.message as string,
            impliedTotal: body.impliedTotal as number | null,
            fieldTotal: body.fieldTotal as number,
            typeConflict: body.typeConflict as boolean,
            impliedQuestionTypes: body.impliedQuestionTypes as string[] | null,
            fieldQuestionTypes: body.fieldQuestionTypes as string[],
          });
          setStatus("idle");
          return;
        }
        if (body.quotaExceeded) {
          setQuotaResetsAt((body.resetsAt as string) || null);
          setStatus("quota_exceeded");
          setError((body.error as string) || "Daily limit reached.");
          return;
        }
        if (body.maintenance) {
          setStatus("maintenance");
          setError((body.error as string) || "Question generation is temporarily unavailable.");
          return;
        }
        if (bodyParseFailed) {
          throw new Error(
            `[HTTP_${res.status}] The server didn't respond in time to start generation (status ${res.status}). This usually means the request was still starting up when it got cut off — try again.`
          );
        }
        const code = body.code ? ` [${body.code}]` : "";
        const devDetail = body.devMessage ? ` — ${body.devMessage}` : "";
        throw new Error(`${(body.error as string) || "Failed to start generation."}${code}${devDetail}`);
      }

      setJobId(body.jobId as string);
      pollJob(body.jobId as string);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Could not start generation. Check your connection and try again.";
      setError(msg);
      setStatus("error");
    }
  };

  const handleCancelJob = async () => {
    if (!jobId) return;
    setCancelling(true);
    try {
      await fetch(`/api/papers/${jobId}`, { method: "DELETE" });
    } catch {
      // Best-effort — the job row is the source of truth either way; if this
      // request fails the job stays running server-side but the user is
      // already back at the form and can simply start a new one.
    } finally {
      stopPolling();
      setCancelling(false);
      setStatus("idle");
    }
  };

  // If the user navigates away mid-poll (or this component unmounts for any
  // other reason), stop the timer — but the job itself keeps running
  // server-side. Coming back to this page and generating again starts a
  // fresh job; re-attaching to an in-flight job on navigation-return isn't
  // wired into this form (there's no "resume" UI), but the underlying job
  // row itself is unaffected — see proof test 6 in the report, which
  // verifies this at the API level.
  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Resume promptly the moment the tab becomes visible again, rather than
  // waiting up to POLL_INTERVAL_MS for the next scheduled tick — pollJob()
  // itself already refuses to do work while document.hidden, this just
  // makes the resume feel immediate instead of laggy.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden && jobId && (status === "generating" || status === "stuck")) {
        stopPolling(); // avoid double-scheduling against the timer already pending
        pollJob(jobId);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, status]);

  const savePaperEdits = async (updatedPaper: GeneratedPaper) => {
    if (!paperDbId) return;
    try {
      const dbPayload = {
        paper: updatedPaper,
        plannerPlan,
        generatorDraft,
        metadata: {
          institutionName,
          courseCode,
          timeAllowed,
          instructions
        }
      };

      const res = await fetch(`/api/questions/${paperDbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updatedPaper.title,
          content: JSON.stringify(dbPayload)
        })
      });
      if (!res.ok) throw new Error(`Autosave failed with status ${res.status}`);
      setAutosaveError(false);
    } catch (err) {
      console.error("Failed to save paper edits to DB:", err);
      setAutosaveError(true);
    }
  };

  const handleMetadataBlur = () => {
    if (paper) {
      savePaperEdits(paper);
    }
  };

  // AI Refine used to hold its own long-lived SSE connection open against
  // /api/questions/generate-stream — the exact architecture that produced
  // the confirmed production timeout ("Task timed out after 120 seconds")
  // on the main generate flow, just never migrated when that flow was fixed.
  // It now creates a job and drives it through the same durable
  // POST /api/papers + pollJob() machinery as handleGenerate, so a refine
  // request gets the same stuck-job detection, backoff, and reconnect
  // handling for free instead of a second, unmaintained copy of it. With
  // this call site migrated, /api/questions/generate-stream had zero
  // remaining callers and has been deleted, along with the equally-dead
  // non-streaming /api/questions/generate.
  const handleAIRefine = async () => {
    if (!aiFeedback.trim() || !paper) return;

    setError("");
    setQuotaRefunded(false);
    setRetryWorthwhile(true);
    setRepairAttemptLogs(null);
    setStatus("generating");
    setJobId(null);
    lastStepRef.current = null;
    lastProgressRef.current = Date.now();
    consecutivePollFailuresRef.current = 0;
    pollAttemptCountRef.current = 0;
    setPlannerStatus("idle"); setGeneratorStatus("idle"); setReviewerStatus("idle");
    setPlannerLogs([]); setGeneratorLogs([]); setReviewerLogs([]);

    const refinementPrompt = `
You are tasked with refining the existing question paper based on the user's revision feedback. Make sure to preserve as much of the existing question paper's structure and formatting as possible, but update the questions, sections, topics, or content to satisfy the revision request.

[User Revision Feedback]:
${aiFeedback}

[Existing Question Paper JSON]:
${JSON.stringify(paper)}
`;

    setAiFeedback("");

    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, grade, topic, difficulty, totalMarks, questionTypes,
          customPrompt: refinementPrompt,
          studyMaterialText,
          // The topic and structured fields were already settled by the
          // generation being refined — re-running topic spellcheck or the
          // implied-vs-field conflict gate against free-text revision
          // feedback would surface a confirmation modal wired to
          // handleGenerate, not this flow, and lose the refinement prompt.
          topicResolution: "useOriginal",
          conflictResolution: "useField",
        }),
      });

      let body: Record<string, unknown> = {};
      let bodyParseFailed = false;
      try {
        body = await res.json();
      } catch {
        bodyParseFailed = true;
      }

      if (!res.ok) {
        if (body.quotaExceeded) {
          setQuotaResetsAt((body.resetsAt as string) || null);
          setStatus("quota_exceeded");
          setError((body.error as string) || "Daily limit reached.");
          return;
        }
        if (body.maintenance) {
          setStatus("maintenance");
          setError((body.error as string) || "Question generation is temporarily unavailable.");
          return;
        }
        if (bodyParseFailed) {
          throw new Error(
            `[HTTP_${res.status}] The server didn't respond in time to start the refinement (status ${res.status}). This usually means the request was still starting up when it got cut off — try again.`
          );
        }
        const code = body.code ? ` [${body.code}]` : "";
        const devDetail = body.devMessage ? ` — ${body.devMessage}` : "";
        throw new Error(`${(body.error as string) || "Failed to start refinement."}${code}${devDetail}`);
      }

      setJobId(body.jobId as string);
      pollJob(body.jobId as string);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Could not start the refinement. Check your connection and try again.";
      setError(msg);
      setStatus("error");
    }
  };

  const handleCopy = () => {
    if (!paper) return;
    
    let text = `${paper.title}\nSubject: ${paper.subject} | Grade: ${paper.grade}\nDifficulty: ${paper.difficulty} | Total Marks: ${paper.totalMarks}\n\n`;
    
    paper.sections.forEach((section) => {
      text += `--- ${section.title} ---\n${section.description}\n\n`;
      section.questions.forEach((q) => {
        text += `Q${q.number}. ${cleanMathText(q.question)} (${q.marks} Marks)\n`;
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt, idx) => {
            text += `   ${String.fromCharCode(65 + idx)}. ${cleanMathText(opt)}\n`;
          });
        }
        if (viewMode === "answers") {
          text += `[Answer: ${cleanMathText(q.answer)}]\n`;
        }
        text += `\n`;
      });
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 pt-14 lg:pt-0">
      {/* Print-Only Title and Paper Layout CSS overrides */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
            font-family: "Times New Roman", Times, serif !important;
          }
          /* Hide all UI elements */
          aside, header, nav, button, form, .no-print, .modal-backdrop, [role="button"] {
            display: none !important;
          }
          /* Hide sidebar layout spacers */
          .hidden.lg\\:block, div[class*="w-60"], div[class*="w-16"] {
            display: none !important;
          }
          /* Override layout wrapper constraints for print pages */
          html, body, #__next, .flex.min-h-screen {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
          }
          .flex-1.flex.flex-col, main {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .print-content {
            display: block !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            font-family: "Times New Roman", Times, serif !important;
          }
          .question-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 1.5rem !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2 sm:gap-3" style={{ fontFamily: "var(--font-display)" }}>
            <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            AI question paper generator
          </h1>
          <p className="text-graphite mt-1 text-xs sm:text-sm">
            A planner, generator, and reviewer agent pipeline drafts your paper, then validates and repairs it against your exact requirements.
          </p>
        </div>
        {paper && (
          <button
            onClick={() => {
              setPaper(null);
              setStatus("idle");
              setCustomPrompt("");
              setStudyMaterialText("");
              setStudyMaterialFileName("");
              setUploadError("");
            }}
            className="flex items-center gap-2 text-sm text-graphite hover:text-ink border border-gray-200 px-4 py-2 rounded-xl bg-surface hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Create new
          </button>
        )}
      </div>

      {status === "idle" && (
        <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-4 sm:p-8 no-print">
          <form onSubmit={handleGenerate} className="space-y-6">
            {conflictInfo && (
              <div className="flex flex-col gap-3 bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                  <p>{conflictInfo.message} Which should I use?</p>
                </div>
                <div className="flex flex-wrap gap-2 pl-8">
                  {conflictInfo.impliedTotal !== null && (
                    <button
                      type="button"
                      onClick={(e) => handleGenerate(e, "useImplied")}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                    >
                      Use {conflictInfo.impliedTotal}
                      {conflictInfo.typeConflict && conflictInfo.impliedQuestionTypes ? ` (${conflictInfo.impliedQuestionTypes.join(", ")})` : ""}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleGenerate(e, "useField")}
                    className="px-4 py-2 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors"
                  >
                    Use {conflictInfo.fieldTotal}
                    {conflictInfo.typeConflict ? ` (${conflictInfo.fieldQuestionTypes.join(", ")})` : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflictInfo(null)}
                    className="px-4 py-2 rounded-lg text-amber-700 hover:bg-amber-100 text-xs font-bold transition-colors"
                  >
                    Let me edit
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Subject *</label>
                <SubjectSelector
                  value={subject}
                  onChange={setSubject}
                  placeholder="Select or type subject..."
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Grade level *</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  required
                >
                  <option value="">Select grade level</option>
                  {grades.map((gr) => (
                    <option key={gr} value={gr}>
                      {gr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Target topic / chapters *</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Calculus: Limits & Continuity, WWI Causes, Organic Carbon Compounds"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Cognitive difficulty *</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Easy", "Medium", "Hard"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                        difficulty === level
                          ? "bg-ink text-paper border-transparent shadow-sm"
                          : "border-gray-200 text-graphite bg-gray-50 hover:bg-surface hover:text-ink"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Marks */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Total marks (target) *</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.max(5, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  min="5"
                  max="200"
                  required
                />
              </div>
            </div>

            {/* Question Types */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Question types (select one or more) *</label>
              <div className="flex flex-wrap gap-3">
                {["MCQ", "Short Answer", "Long Answer"].map((type) => {
                  const isChecked = questionTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        isChecked
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "border-gray-200 text-graphite hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                      />
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Prompt / Special Style Instructions */}
            <div className="border-t border-rule pt-6">
              <label className="block text-sm font-semibold text-ink mb-2">
                Custom paper style and special instructions (optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Focus on practical programming problems, include code snippets, make the questions highly conceptual, or format in a specific way..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>

            {/* Study Material Upload */}
            <div className="border-t border-rule pt-6">
              <label className="block text-sm font-semibold text-ink mb-2">
                Syllabus / study material upload (optional)
              </label>
              <p className="text-xs text-graphite mb-3">
                Upload PDFs, Markdown, TXT, or Word files to generate paper content directly from your documents.
              </p>
              
              {!studyMaterialFileName ? (
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.docx,.doc"
                    onChange={handleStudyMaterialUpload}
                    disabled={uploadingMaterial}
                    id="study-material-file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      {uploadingMaterial ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      {uploadingMaterial ? "Extracting document content..." : "Click or drag study materials here"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Supports PDF, TXT, MD, DOCX (max 10MB)</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-green-50/80 border border-green-200/50 rounded-xl">
                  <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center shadow-sm">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{studyMaterialFileName}</p>
                    <p className="text-graphite text-xs mt-0.5">
                      Successfully loaded • {studyMaterialText.length} characters extracted
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearStudyMaterial}
                    className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {uploadError}
                </p>
              )}
            </div>

            {/* Academic Printing Layout Settings */}
            <div className="border-t border-rule pt-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                Academic printing layout (optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-graphite mb-1.5 uppercase">Institution / School Name</label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-graphite mb-1.5 uppercase">Course Code</label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CS-101"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-graphite mb-1.5 uppercase">Time Allowed</label>
                  <input
                    type="text"
                    value={timeAllowed}
                    onChange={(e) => { setTimeAllowed(e.target.value); setTimeAllowedTouched(true); }}
                    placeholder="e.g. 3 Hours"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-graphite mb-1.5 uppercase">Exam Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter custom instructions..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl text-paper font-bold bg-ink shadow-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base"
            >
              <GraduationCap className="w-5 h-5" />
              Generate question paper
            </button>
            <SharedQuotaBadge />
          </form>
        </div>
      )}

      {/* ── Multi-Agent Command Center (Live) ── */}
      {status === "generating" && (
        <div className="space-y-4 no-print">
          {/* Header */}
          <div className="bg-fixed-ink rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    AI Agent Pipeline Running
                  </h2>
                  <p className="text-white/70 text-xs">Planner, Generator, and Reviewer agents building your exam paper</p>
                </div>
              </div>
              <button
                onClick={handleCancelJob}
                disabled={cancelling}
                className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel"}
              </button>
            </div>
            {/* Agent pipeline progress dots */}
            <div className="flex items-center gap-3 mt-4">
              {[
                { label: "Planner", s: plannerStatus },
                { label: "Generator", s: generatorStatus },
                { label: "Reviewer", s: reviewerStatus },
              ].map((a, i) => (
                <div key={a.label} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                      a.s === "active" ? "bg-yellow-300 shadow-lg shadow-yellow-300/60 animate-pulse" :
                      a.s === "done" ? "bg-green-300" : "bg-white/30"
                    }`} />
                    <span className={`text-xs font-semibold transition-colors ${
                      a.s === "active" ? "text-yellow-200" :
                      a.s === "done" ? "text-green-200" : "text-blue-200"
                    }`}>{a.label}</span>
                  </div>
                  {i < 2 && <div className="w-8 h-px bg-white/25" />}
                </div>
              ))}
            </div>
          </div>

          {/* Agent Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* ── Planner Agent Card ── */}
            <AgentCard
              icon={Calendar}
              name="Planner Agent"
              role="Designs exam structure & mark distribution"
              status={plannerStatus}
              logs={plannerLogs}
              accentColor="blue"
            />
            {/* ── Generator Agent Card ── */}
            <AgentCard
              icon={PenLine}
              name="Generator Agent"
              role="Writes questions, options & model answers"
              status={generatorStatus}
              logs={generatorLogs}
              accentColor="indigo"
            />
            {/* ── Reviewer Agent Card ── */}
            <AgentCard
              icon={Search}
              name="Reviewer Agent"
              role="Fact-checks, audits & polishes the paper"
              status={reviewerStatus}
              logs={reviewerLogs}
              accentColor="purple"
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-10 max-w-lg mx-auto text-center no-print">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Generation Failed</h2>
          <p className="text-graphite text-sm mt-1">{error}</p>
          {quotaRefunded && (
            <p className="text-green-700 text-xs font-semibold mt-3 bg-green-50 rounded-lg px-3 py-2 inline-block">
              Your daily generation credit was refunded — this attempt won&apos;t count against your limit.
            </p>
          )}
          {repairAttemptLogs && repairAttemptLogs.length > 0 && (
            <div className="text-left text-xs text-graphite bg-gray-50 rounded-lg p-3 mt-3 space-y-1">
              <p className="font-bold uppercase tracking-wide text-[10px] text-gray-500">What each attempt found</p>
              {repairAttemptLogs.map((a) => (
                <p key={a.attempt}>
                  {/* Never render a.violations directly — those are repair-prompt
                      instructions aimed at the model, not user copy. */}
                  Attempt {a.attempt}: {a.violations.length === 0 ? "passed" : buildUserFacingValidationMessage(a.violations)}
                </p>
              ))}
            </div>
          )}
          <button
            onClick={() => setStatus("idle")}
            className="mt-6 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
          >
            {retryWorthwhile ? "Try Again" : "Back to form"}
          </button>
          {!retryWorthwhile && (
            <p className="text-graphite text-xs mt-2">Retrying right now won&apos;t help — see the message above for why.</p>
          )}
        </div>
      )}

      {/* Stuck State — no progress within the client-side timeout window.
          The job may still finish server-side (the poll loop stopped, the
          job itself did not) — this is the "get out" the old spinner-
          forever state never gave the user. */}
      {status === "stuck" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 max-w-lg mx-auto text-center no-print">
          <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-800">This is taking longer than expected</h2>
          <p className="text-amber-700 text-sm mt-1">{error}</p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => {
                setStatus("generating");
                lastProgressRef.current = Date.now();
                pollAttemptCountRef.current = 0;
                if (jobId) pollJob(jobId);
              }}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-colors"
            >
              Keep waiting
            </button>
            <button
              onClick={handleCancelJob}
              className="px-6 py-3 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-sm transition-colors"
            >
              Cancel and start over
            </button>
          </div>
        </div>
      )}

      {/* Connection Lost State — deliberately distinct from "error"/Generation
          Failed. A 504/network failure on the poll means this browser
          couldn't reach the server for a few tries in a row; it says
          nothing about whether the job itself failed. Reconnecting re-reads
          real state rather than restarting anything. */}
      {status === "connection_lost" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-10 max-w-lg mx-auto text-center no-print">
          <AlertTriangle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-blue-900">Connection lost</h2>
          <p className="text-blue-800 text-sm mt-1">{error}</p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => {
                setStatus("generating");
                consecutivePollFailuresRef.current = 0;
                lastProgressRef.current = Date.now();
                if (jobId) pollJob(jobId);
              }}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
            >
              Reconnect
            </button>
            <button
              onClick={handleCancelJob}
              className="px-6 py-3 rounded-xl bg-white border border-blue-300 hover:bg-blue-100 text-blue-900 font-bold text-sm transition-colors"
            >
              Cancel and start over
            </button>
          </div>
        </div>
      )}

      {/* Quota Exceeded State */}
      {status === "quota_exceeded" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 max-w-lg mx-auto text-center no-print">
          <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-800">Daily generation limit reached</h2>
          <p className="text-amber-700 text-sm mt-1">
            You&apos;ve used today&apos;s free question paper generations.
            {quotaResetsAt && ` Resets ${new Date(quotaResetsAt).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}.`}
          </p>
          <button
            disabled
            className="mt-6 px-6 py-3 rounded-xl bg-surface-2 text-gray-400 font-bold text-sm cursor-not-allowed"
          >
            Come back after your limit resets
          </button>
        </div>
      )}

      {/* Maintenance State */}
      {status === "maintenance" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 max-w-lg mx-auto text-center no-print">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-800">Generation is paused for today</h2>
          <p className="text-amber-700 text-sm mt-1">
            We&apos;ve hit our daily processing limit to keep the service running smoothly. Please try again tomorrow.
          </p>
          <button
            disabled
            className="mt-6 px-6 py-3 rounded-xl bg-surface-2 text-gray-400 font-bold text-sm cursor-not-allowed"
          >
            Come back tomorrow
          </button>
        </div>
      )}

      {/* Paper Presentation Screen */}
      {status === "complete" && paper && (
        <div className="space-y-6">
          {autosaveError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm no-print">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">Your last edit didn&apos;t save</p>
                <p className="text-red-600 mt-0.5">Check your connection and try the edit again — this page still shows your change, but it wasn&apos;t written to the database.</p>
              </div>
            </div>
          )}

          {/* Degraded-generation warning — shown when the AI pipeline hit a
              problem (usually a transient rate limit) and fell back to
              either an unreviewed draft or a fully generic placeholder.
              reviewNotes is the one place that fallback is recorded. */}
          {(paper.reviewNotes || []).some((n) => n.startsWith("[Warning]")) && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm no-print">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">This paper wasn&apos;t fully AI-reviewed</p>
                <p className="text-amber-700 mt-0.5">
                  {paper.reviewNotes!.find((n) => n.startsWith("[Warning]"))?.replace(/^\[Warning\]\s*/, "")}
                </p>
              </div>
            </div>
          )}

          {/* Topic-match notice — the topic-vs-topicAddressed keyword check
              (paperValidation.ts) is a heuristic over free-form model text,
              not a guarantee, and is deliberately never a hard gate: a false
              positive here must never block a paper that's actually
              on-topic. This is the check flagging low confidence, not an
              error — the paper was still fully generated and reviewed. */}
          {(paper.reviewNotes || []).some((n) => n.startsWith("[TopicNotice]")) && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm no-print">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Worth a quick check</p>
                <p className="text-amber-700 mt-0.5">
                  {paper.reviewNotes!.find((n) => n.startsWith("[TopicNotice]"))?.replace(/^\[TopicNotice\]\s*/, "")}
                </p>
              </div>
            </div>
          )}

          {/* Controls toolbar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-3 bg-surface border border-rule p-3 sm:p-4 rounded-2xl shadow-sm no-print">
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={() => setViewMode("paper")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === "paper"
                    ? "bg-blue-50 text-blue-700"
                    : "text-graphite hover:bg-gray-50"
                }`}
              >
                <FileText className="w-4 h-4" /> Question paper
              </button>
              <button
                onClick={() => setViewMode("answers")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === "answers"
                    ? "bg-blue-50 text-blue-700"
                    : "text-graphite hover:bg-gray-50"
                }`}
              >
                <Eye className="w-4 h-4" /> Answer key
              </button>
              <button
                onClick={() => setViewMode("logs")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === "logs"
                    ? "bg-purple-50 text-purple-700"
                    : "text-graphite hover:bg-gray-50"
                }`}
              >
                <Settings className="w-4 h-4" /> Agent logs
              </button>
            </div>

            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold bg-surface hover:bg-gray-50 text-ink transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy text"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-ink px-4 py-2 rounded-xl text-sm font-bold text-paper shadow-md hover:opacity-95 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </div>
          </div>

          {/* Clean printable exam container — a real exam paper on real paper
              does not invert to dark mode any more than a printed page
              would (see .paper-document overrides in globals.css, same
              --fixed-* principle as MarkedAnswerSheet.tsx's homepage
              mockup). bg-fixed-paper/border-fixed-rule instead of the
              normal bg-surface/border-rule keeps this card literal paper
              regardless of site theme. */}
          {viewMode !== "logs" ? (
            <>
              <div className="paper-document bg-fixed-paper rounded-3xl border border-fixed-rule shadow-xl p-5 sm:p-10 md:p-14 print-content font-serif">
              {/* Header Title */}
              <div className="text-center pb-2 no-print">
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  onBlur={handleMetadataBlur}
                  className="w-full text-center text-2xl font-bold uppercase tracking-wider text-gray-900 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-surface focus:outline-none rounded px-2 transition-all"
                  style={{ fontFamily: "serif" }}
                />
                <h2 className="text-sm font-bold tracking-wide text-graphite uppercase mt-1">
                  Term End Examination • {paper.subject}
                </h2>
              </div>
              <div className="hidden print:block text-center pb-2">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900" style={{ fontFamily: "serif" }}>
                  {institutionName || "UNIVERSITY EXAMINATION BOARD"}
                </h1>
                <h2 className="text-sm font-bold tracking-wide text-graphite uppercase mt-1">
                  Term End Examination • {paper.subject}
                </h2>
              </div>

              {/* Student Identity and Exam Details Grid */}
              <div className="border-t-2 border-b-2 border-gray-800 py-4 my-4 sm:my-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-medium">
                {/* Left Side: Exam Metadata */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 no-print">
                    <strong>Course Code:</strong>
                    <input
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      onBlur={handleMetadataBlur}
                      placeholder="Enter code"
                      className="bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-surface focus:outline-none rounded px-1 text-xs transition-all w-32 uppercase font-bold"
                    />
                  </div>
                  <div className="hidden print:block font-bold">
                    {courseCode && <span><strong>Course Code:</strong> {courseCode.toUpperCase()}</span>}
                  </div>
                  <div><strong>Grade/Class:</strong> {paper.grade}</div>
                  <div className="flex items-center gap-1.5 no-print">
                    <strong>Time Allowed:</strong>
                    <input
                      type="text"
                      value={timeAllowed}
                      onChange={(e) => setTimeAllowed(e.target.value)}
                      onBlur={handleMetadataBlur}
                      className="bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-surface focus:outline-none rounded px-1 text-xs transition-all w-32"
                    />
                  </div>
                  <div className="hidden print:block">
                    <strong>Time Allowed:</strong> {timeAllowed}
                  </div>
                  <div><strong>Difficulty Level:</strong> {paper.difficulty}</div>
                  <div><strong>Total Marks:</strong> {paper.totalMarks} Marks</div>
                </div>

                {/* Right Side: Candidate Identification */}
                <div className="border-l-0 md:border-l border-gray-300 pl-0 md:pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Candidate Name:</span>
                    <div className="flex-1 border-b border-dashed border-gray-400 h-4">&nbsp;</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Roll / Seat No:</span>
                    <div className="flex-1 border-b border-dashed border-gray-400 h-4">&nbsp;</div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {instructions && (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-8 text-xs italic">
                  <strong className="block text-ink not-italic uppercase tracking-wider mb-1 no-print">General Instructions (Click to Edit):</strong>
                  <strong className="hidden print:block text-ink not-italic uppercase tracking-wider mb-1">General Instructions:</strong>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    onBlur={handleMetadataBlur}
                    rows={2}
                    className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-surface focus:outline-none rounded p-1 text-xs text-graphite leading-relaxed resize-y font-serif italic no-print"
                  />
                  <div className="hidden print:block whitespace-pre-line text-graphite">{instructions}</div>
                </div>
              )}

              {/* Sections & Questions */}
              <div className="space-y-8">
                {paper.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-4">
                    <div className="border-b border-gray-300 pb-2">
                      <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">{section.title}</h2>
                      <p className="text-graphite text-xs mt-0.5 italic">{section.description}</p>
                    </div>

                    <div className="space-y-6">
                      {section.questions.map((q, qIdx) => {
                        const isEditing = editingIndex?.sIdx === sIdx && editingIndex?.qIdx === qIdx;
                        return (
                          <div key={q.number} className="relative pl-2 question-block group/q animate-fade-in">
                            {/* Hover Edit Trigger (Only visible on screen, hidden on print) */}
                            {!isEditing && (
                              <button
                                onClick={() => {
                                  setEditingIndex({ sIdx, qIdx });
                                  setEditQuestionText(q.question);
                                  setEditQuestionMarks(q.marks);
                                  setEditQuestionAnswer(q.answer);
                                  setEditQuestionOptions(q.options || []);
                                }}
                                className="absolute -left-6 top-0.5 text-gray-400 hover:text-blue-600 opacity-0 group-hover/q:opacity-100 transition-opacity no-print p-0.5"
                                title="Edit Question"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isEditing ? (
                              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3 no-print">
                                <div>
                                  <label className="block text-xs font-bold text-graphite uppercase tracking-wide mb-1">Question Text</label>
                                  <textarea
                                    value={editQuestionText}
                                    onChange={(e) => setEditQuestionText(e.target.value)}
                                    rows={2}
                                    className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold text-graphite uppercase tracking-wide mb-1">Marks</label>
                                    <input
                                      type="number"
                                      value={editQuestionMarks}
                                      onChange={(e) => setEditQuestionMarks(parseInt(e.target.value) || 0)}
                                      className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-graphite uppercase tracking-wide mb-1">Answer Key</label>
                                    <input
                                      type="text"
                                      value={editQuestionAnswer}
                                      onChange={(e) => setEditQuestionAnswer(e.target.value)}
                                      className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {editQuestionOptions.length > 0 && (
                                  <div className="space-y-2">
                                    <label className="block text-xs font-bold text-graphite uppercase tracking-wide mb-1">MCQ Options</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {editQuestionOptions.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-gray-400">{String.fromCharCode(65 + oIdx)}.</span>
                                          <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                              const newOpts = [...editQuestionOptions];
                                              newOpts[oIdx] = e.target.value;
                                              setEditQuestionOptions(newOpts);
                                            }}
                                            className="flex-1 text-xs p-1.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2 justify-end pt-1">
                                  <button
                                    onClick={() => setEditingIndex(null)}
                                    className="px-3 py-1.5 text-xs font-semibold text-graphite hover:bg-surface-2 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!paper) return;
                                      const updatedPaper = { ...paper };
                                      const sectionQuestions = [...updatedPaper.sections[sIdx].questions];
                                      sectionQuestions[qIdx] = {
                                        ...sectionQuestions[qIdx],
                                        question: editQuestionText,
                                        marks: editQuestionMarks,
                                        answer: editQuestionAnswer,
                                        options: editQuestionOptions.length > 0 ? editQuestionOptions : undefined
                                      };
                                      updatedPaper.sections[sIdx] = {
                                        ...updatedPaper.sections[sIdx],
                                        questions: sectionQuestions
                                      };
                                      setPaper(updatedPaper);
                                      savePaperEdits(updatedPaper);
                                      setEditingIndex(null);
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-paper bg-ink rounded-lg shadow-sm"
                                  >
                                    Save Question
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-4">
                                  <p className="text-gray-900 font-medium flex-1">
                                    <span className="font-bold mr-1.5">Q{q.number}.</span>
                                    {cleanMathText(q.question)}
                                  </p>
                                  <span className="text-xs font-bold text-graphite whitespace-nowrap">
                                    [{q.marks} Mark{q.marks > 1 ? "s" : ""}]
                                  </span>
                                </div>

                                {/* Options if MCQ */}
                                {q.options && q.options.length > 0 && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pl-6">
                                    {q.options.map((opt, oIdx) => (
                                      <p key={oIdx} className="text-sm text-ink">
                                        <span className="font-semibold text-graphite mr-2">
                                          {String.fromCharCode(65 + oIdx)}.
                                        </span>
                                        {cleanMathText(opt)}
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {/* Model Answer (if viewMode is answers) */}
                                {viewMode === "answers" && (
                                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl no-print">
                                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                                      Correct Answer / Evaluator Rubric:
                                    </p>
                                    <p className="text-sm text-blue-900 font-medium">
                                      {cleanMathText(q.answer)}
                                    </p>
                                    {q.markScheme && q.markScheme.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-blue-200">
                                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5">
                                          Mark Scheme:
                                        </p>
                                        <ul className="space-y-1">
                                          {q.markScheme.map((p, pIdx) => (
                                            <li key={pIdx} className="text-sm text-blue-900 flex justify-between gap-3">
                                              <span>{cleanMathText(p.point)}</span>
                                              <span className="font-bold flex-shrink-0">{p.marks} {p.marks === 1 ? "mark" : "marks"}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Refinement Feedback Card */}
            <div className="bg-surface rounded-3xl border border-rule shadow-md p-6 mt-6 no-print space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-fixed-ink flex items-center justify-center text-white flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                    AI paper refinement and tweaks
                  </h3>
                  <p className="text-xs text-graphite">
                    Instruct the agents to update the paper (e.g. &quot;change Section A questions to be more focused on algorithms&quot;).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <textarea
                  value={aiFeedback}
                  onChange={(e) => setAiFeedback(e.target.value)}
                  placeholder="Enter revision instructions for the AI agents..."
                  rows={2}
                  className="flex-1 text-sm p-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                />
                <button
                  onClick={handleAIRefine}
                  disabled={!aiFeedback.trim()}
                  className="inline-flex items-center gap-2 bg-ink text-paper font-semibold text-sm px-5 py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  Apply tweaks
                </button>
              </div>
            </div>
          </>
        ) : (
            // Agent logs timeline view
            <div className="bg-surface rounded-2xl border border-rule p-8 shadow-sm space-y-8 no-print">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  Agent Collaborative Audit Trail
                </h2>
                <p className="text-graphite text-sm">
                  Trace outputs and quality checks produced during paper generation.
                </p>
              </div>

              <div className="space-y-6">
                {/* Planner logs */}
                <div className="relative pl-6 border-l-2 border-blue-200">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-white" />
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Planner Agent Outline
                  </h3>
                  <div className="mt-2 bg-gray-50 border border-rule rounded-xl p-4 text-xs font-mono text-graphite max-h-60 overflow-auto">
                    {plannerPlan ? JSON.stringify(plannerPlan, null, 2) : "No planner logs found"}
                  </div>
                </div>

                {/* Generator logs */}
                <div className="relative pl-6 border-l-2 border-indigo-200">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white" />
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Generator Agent Draft
                  </h3>
                  <div className="mt-2 bg-gray-50 border border-rule rounded-xl p-4 text-xs font-mono text-graphite max-h-60 overflow-auto">
                    {generatorDraft ? JSON.stringify(generatorDraft, null, 2) : "No generator logs found"}
                  </div>
                </div>

                {/* Reviewer Quality logs */}
                <div className="relative pl-6">
                  <div className="absolute -left-1 top-0.5 w-4 h-4 rounded-full bg-green-500 border-4 border-white" />
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-500" />
                    Quality and reviewer audit notes
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {(paper.reviewNotes || []).map((note, idx) => {
                      const isWarning = note.startsWith("[Warning]") || note.startsWith("[TopicNotice]");
                      return (
                        <li
                          key={idx}
                          className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                            isWarning ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"
                          }`}
                        >
                          {isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          )}
                          <span>{isWarning ? note.replace(/^\[Warning\]\s*/, "").replace(/^\[TopicNotice\]\s*/, "") : note}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
