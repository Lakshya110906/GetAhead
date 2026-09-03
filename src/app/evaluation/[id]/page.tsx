"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  ArrowLeft,
  Download,
  Share2,
  BookMarked,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Brain,
  RotateCcw,
  Info,
} from "lucide-react";

// Without a `loading` component, the tutor panel's chunk-load window (the
// gap between this page mounting and the tutor JS actually arriving) had
// nothing on screen at all — no launcher button, no indication anything
// was coming. This mirrors the same launcher button's fixed position so
// nothing shifts once the real component takes over.
const AiTutor = dynamic(() => import("@/components/tutor/AiTutor").then((m) => m.AiTutor), {
  ssr: false,
  loading: () => (
    <div
      className="fixed right-6 bottom-6 z-40 bg-ink text-paper p-4 rounded-full shadow-xl flex items-center gap-2 no-print opacity-70"
      aria-label="Loading AI tutor"
    >
      <div className="w-5 h-5 border-2 border-paper/40 border-t-paper rounded-full animate-spin" />
    </div>
  ),
});

interface EvaluationData {
  id: string;
  subject: string;
  grade: string | null;
  examType: string;
  status: string;
  totalMarks: number | null;
  obtainedMarks: number | null;
  percentage: number | null;
  aiFeedback: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  recommendations: string[] | null;
  marksBreakdown: Array<{
    topic: string;
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
  }> | null;
  questionGrades: Array<{
    questionNumber: number;
    marksAwarded: number;
    marksAvailable: number;
    topic?: string;
    correctPoints: string[];
    incorrectPoints: string[];
    errorType: "correct" | "incorrect" | "unreadable" | "blank";
    // Free text, model-authored, only meaningful (and only shown — see
    // displayErrorCategory's server-side twin, answerSheetGrading.ts) when
    // errorType is "incorrect". Replaces a hardcoded method_error/
    // arithmetic_slip binary that didn't fit every subject (an unbalanced
    // chemical equation labelled "Arithmetic slip" because maths was the
    // only taxonomy on offer).
    errorCategory?: string;
    groundingQuote: string;
    feedback: string;
  }> | null;
  unreadableQuestions: number[];
  subjectMismatch: { declared: string; detected: string } | null;
  gradeMismatch: { declared: string; detected: string } | null;
  // Gemini's grading call is not perfectly consistent run to run, even for
  // the identical file (measured directly: a clear-cut error scored 2/5 in
  // 3 of 4 identical live samples and 1/5 in the 4th). Rather than let a
  // re-upload of the same sheet silently return a different grade, this
  // result may be REUSED from an earlier identical evaluation instead of
  // freshly graded — gradedFromCache says which, so it can be disclosed
  // rather than hidden.
  gradedFromCache: boolean;
  createdAt: string;
}

function getGrade(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  return "F";
}



export default function EvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  // A fetch failure (network drop, 500) and a genuine 404/permission
  // denial both leave `data` null — but they are not the same thing, and
  // "does not exist or you do not have permission" is actively wrong copy
  // to show for a transient network failure. Tracked separately so the
  // two cases render distinct messages.
  const [loadError, setLoadError] = useState(false);

  // Saved, share and print states
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Re-evaluate: an explicit, user-initiated request for a fresh grading
  // pass that bypasses the grading cache (see gradingCache.ts) — the only
  // sanctioned way to get a different mark for an unchanged file.
  const [regrading, setRegrading] = useState(false);
  const [regradeError, setRegradeError] = useState("");
  const regradePollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchReport = useCallback(() => {
    return fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setData({
            ...d,
            strengths: d.strengths || [],
            weaknesses: d.weaknesses || [],
            recommendations: d.recommendations || [],
            marksBreakdown: d.marksBreakdown || [],
            questionGrades: d.questionGrades || null,
            unreadableQuestions: d.unreadableQuestions || [],
            subjectMismatch: d.subjectMismatch || null,
            gradeMismatch: d.gradeMismatch || null,
            gradedFromCache: d.gradedFromCache || false,
          });
          setLoadError(false);
        } else {
          setLoadError(true);
        }
      })
      .catch(() => setLoadError(true));
  }, [id]);

  useEffect(() => {
    if (!id || id === "demo") {
      setTimeout(() => {
        setLoading(false);
      }, 0);
      return;
    }

    fetchReport().finally(() => setLoading(false));

    // Fetch save status
    fetch(`/api/reports/save?evaluationId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.saved) {
          setIsSaved(true);
        }
      })
      .catch(() => {});
  }, [id, fetchReport]);

  useEffect(() => {
    return () => {
      if (regradePollRef.current) clearTimeout(regradePollRef.current);
    };
  }, []);

  const handleRegrade = async () => {
    if (!id || regrading) return;
    // Disclosure, not a formality: the whole point of this action is that
    // it can come back different from the result on screen right now.
    if (!confirm("Re-evaluating asks the grader for a fresh look at this same file. Marks may differ from the result shown now — this cannot be undone. Continue?")) {
      return;
    }
    setRegrading(true);
    setRegradeError("");
    try {
      const res = await fetch(`/api/evaluations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regrade" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setRegradeError(d.error || "Couldn't start re-evaluation.");
        setRegrading(false);
        return;
      }
      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/evaluations/${id}`);
          const statusData = await statusRes.json();
          if (statusData.status === "SUCCEEDED") {
            await fetchReport();
            setRegrading(false);
            return;
          }
          if (statusData.status === "FAILED") {
            setRegradeError(statusData.lastError || "Re-evaluation failed.");
            setRegrading(false);
            return;
          }
          regradePollRef.current = setTimeout(poll, 2000);
        } catch {
          regradePollRef.current = setTimeout(poll, 2000);
        }
      };
      poll();
    } catch {
      setRegradeError("Couldn't start re-evaluation.");
      setRegrading(false);
    }
  };

  useEffect(() => {
    const handleHighlight = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.index === "number") {
        const idx = detail.index;
        setHighlightedIndex(idx);

        // Scroll to question row
        const el = document.getElementById(`breakdown-row-${idx}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Reset highlight after 3 seconds
        setTimeout(() => {
          setHighlightedIndex(null);
        }, 3000);
      }
    };

    window.addEventListener("tutor:highlight", handleHighlight);
    return () => {
      window.removeEventListener("tutor:highlight", handleHighlight);
    };
  }, []);

  const handleSave = async () => {
    if (!id || !data) return;

    setSaveLoading(true);
    try {
      const res = await fetch("/api/reports/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId: id,
          name: `${data.subject} - Evaluation report`,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setIsSaved(d.saved);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleShare = async () => {
    if (!data) return;
    const shareUrl = window.location.href;
    const shareData = {
      title: `${data.subject} evaluation report`,
      text: `View my AI-powered evaluation report for ${data.subject}.`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Brain className="w-10 h-10 text-graphite animate-pulse mx-auto mb-4" />
          <p className="text-graphite text-sm">Loading your evaluation report…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
          {loadError ? "Couldn't load this evaluation" : "Evaluation not found"}
        </h2>
        <p className="text-graphite text-sm mt-2 mb-6">
          {loadError
            ? "Something went wrong loading this report — try refreshing the page."
            : "The evaluation report you are trying to access does not exist or you do not have permission to view it."}
        </p>
        <button
          onClick={() => (loadError ? window.location.reload() : router.push("/dashboard"))}
          className="inline-flex items-center gap-2 bg-ink text-paper font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> {loadError ? "Retry" : "Back to dashboard"}
        </button>
      </div>
    );
  }

  const pct = data.percentage ?? 0;
  const grade = getGrade(pct);
  const breakdown = data.marksBreakdown || [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative max-w-7xl mx-auto">
      <div className="flex-1 min-w-0 space-y-6 lg:pr-[var(--tutor-width,0px)] transition-all duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-surface border border-rule rounded-xl flex items-center justify-center hover:bg-paper transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-graphite" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
              {data.subject} <span className="text-graphite font-normal">— evaluation report</span>
            </h1>
            <p className="text-graphite text-sm">
              {data.grade} • {data.examType} • {new Date(data.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleRegrade}
            disabled={regrading}
            aria-label="Ask the grader for a fresh evaluation of this same file"
            title="Marks may differ from the result shown now"
            className="inline-flex items-center gap-2 border border-rule bg-surface text-ink text-sm font-medium px-4 py-2 rounded-xl hover:bg-paper transition-colors disabled:opacity-60"
          >
            <RotateCcw className={`w-4 h-4 ${regrading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{regrading ? "Re-evaluating…" : "Re-evaluate"}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saveLoading}
            aria-label={isSaved ? "Remove from saved reports" : "Save this report"}
            className={`inline-flex items-center gap-2 border text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60 ${
              isSaved
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "border-rule bg-surface text-ink hover:bg-paper"
            }`}
          >
            <BookMarked className={`w-4 h-4 ${isSaved ? "fill-green-600 text-green-600" : ""}`} />
            <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
          </button>
          <button
            onClick={handleShare}
            aria-label="Copy a link to this report"
            className="inline-flex items-center gap-2 border border-rule bg-surface text-ink text-sm font-medium px-4 py-2 rounded-xl hover:bg-paper transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{shareCopied ? "Copied!" : "Share"}</span>
          </button>
          <button
            onClick={handlePrint}
            aria-label="Print or save as PDF"
            className="inline-flex items-center gap-2 bg-ink text-paper text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF / Print</span>
          </button>
        </div>
      </div>

      {regradeError && (
        <div className="no-print flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{regradeError}</span>
        </div>
      )}

      {data.gradedFromCache && (
        <div className="no-print flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl px-4 py-3">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            This result reuses an earlier grading of an identical answer sheet, rather than a fresh pass — the same input can occasionally score
            a mark or two differently between passes. Use &quot;Re-evaluate&quot; above for a new attempt.
          </span>
        </div>
      )}

      {/* Score strip — one compact line, not four competing cards. Every
          figure that used to be its own card is still here (marks, %,
          grade, topics covered), just no longer fighting the marked
          script below for the eye's first stop. */}
      <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span
              className={`text-4xl sm:text-5xl font-bold font-mono tabular-nums ${pct >= 75 ? "text-green-600" : "text-amber-600"}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {grade}
            </span>
            <span className="text-lg font-mono tabular-nums text-graphite">
              {pct.toFixed(1)}%
            </span>
            <span className="text-sm font-mono tabular-nums text-graphite">
              ({data.obtainedMarks}/{data.totalMarks} marks)
            </span>
          </div>
          {breakdown.length > 0 && (
            <span className="text-xs font-mono tabular-nums text-graphite bg-surface-2 px-2.5 py-1 rounded-lg">
              {breakdown.length} topic{breakdown.length === 1 ? "" : "s"} covered
            </span>
          )}
        </div>
        <div className="h-2.5 bg-surface-2 rounded-full overflow-hidden mt-4">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: pct >= 75 ? "var(--tick)" : "var(--examiner)",
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-graphite mt-1.5 font-mono tabular-nums">
          <span>0%</span>
          <span className="text-amber-500 font-medium">Pass 50%</span>
          <span className="text-green-500 font-medium">Merit 75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Subject/grade mismatch — surfaced prominently rather than silently
          graded against a rubric the paper itself doesn't seem to match.
          Moved ahead of the marked script: a caveat about what was graded
          against belongs before the grading detail, not after it. */}
      {(data.subjectMismatch || data.gradeMismatch) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            {data.subjectMismatch && (
              <p>This paper looks like <strong>{data.subjectMismatch.detected}</strong>, but the evaluation was requested as <strong>{data.subjectMismatch.declared}</strong>.</p>
            )}
            {data.gradeMismatch && (
              <p>This paper looks like grade/level <strong>{data.gradeMismatch.detected}</strong>, but <strong>{data.gradeMismatch.declared}</strong> was selected.</p>
            )}
            <p className="mt-1">Grading proceeded using the rubric for what was selected — double-check the result matches what you intended to submit.</p>
          </div>
        </div>
      )}

      {/* Unreadable questions — excluded from the total, said so prominently. */}
      {data.unreadableQuestions && data.unreadableQuestions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            Question{data.unreadableQuestions.length > 1 ? "s" : ""} {data.unreadableQuestions.join(", ")} could not be read clearly enough to grade, and {data.unreadableQuestions.length > 1 ? "were" : "was"} excluded from both the marks awarded and the total available above.
          </p>
        </div>
      )}

      {/* ═══ THE MARKED SCRIPT — the signature element. ═══
          Every question the AI graded, presented as an examiner would mark
          a real script: the student's own words (Kalam), the mark in the
          margin (mono, circled), the examiner's note beside it (Caveat) —
          in examiner red only where a real correction was made, in tick
          green where the answer was simply right. Same data as before
          (data.questionGrades), same conditional, same fields — no
          question, quote, point, or feedback string removed, just given
          the space and materials the brief asks for instead of a muted
          card list. */}
      {data.questionGrades && data.questionGrades.length > 0 ? (
        <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-4 sm:p-6">
          <h2 className="text-base font-bold text-ink mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Question-by-question
          </h2>
          <p className="text-xs text-graphite mb-5">
            Every mark, grounded in what you actually wrote — not a summary.
          </p>
          <div className="divide-y divide-rule">
            {data.questionGrades.map((q) => {
              const isCorrect = q.errorType === "correct";
              // Same consistency guard as displayErrorCategory() server-side
              // (answerSheetGrading.ts): a category with no incorrectPoints
              // behind it is dropped rather than shown next to feedback it
              // doesn't support.
              const category = q.errorType === "incorrect" && q.errorCategory?.trim() && q.incorrectPoints.length > 0 ? q.errorCategory.trim() : null;
              const errorLabel =
                q.errorType === "incorrect" ? (category ?? "Incorrect") :
                q.errorType === "unreadable" ? "Unreadable" :
                q.errorType === "blank" ? "Blank" : "Correct";
              const markColor = isCorrect ? "var(--tick)" : "var(--examiner)";
              return (
                <div key={q.questionNumber} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    {/* Margin mark — mono, circled, examiner red only when
                        something was actually marked wrong. */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 w-14">
                      <div
                        className="w-11 h-11 rounded-full border-2 flex items-center justify-center font-mono tabular-nums text-sm font-bold"
                        style={{ borderColor: markColor, color: markColor }}
                      >
                        {q.marksAwarded}/{q.marksAvailable}
                      </div>
                      <span className="text-xxs font-mono text-graphite">Q{q.questionNumber}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {isCorrect ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <span className={`text-xs font-semibold ${isCorrect ? "text-green-600" : "text-amber-600"}`}>
                          {errorLabel}
                        </span>
                        {q.topic && <span className="text-xs text-graphite">• {q.topic}</span>}
                      </div>

                      {/* The student's own answer — ruled paper, Kalam,
                          fixed (never inverts in dark mode — it's a
                          document, not chrome). */}
                      {q.groundingQuote && (
                        <div
                          className="rounded-lg px-3.5 py-2.5 mb-2.5 border border-fixed-rule bg-fixed-paper"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(to bottom, transparent, transparent 27px, var(--fixed-rule) 28px)",
                          }}
                        >
                          <p className="text-fixed-ink text-base leading-[28px]" style={{ fontFamily: "var(--font-handwriting)" }}>
                            {q.groundingQuote}
                          </p>
                        </div>
                      )}

                      {(q.correctPoints.length > 0 || q.incorrectPoints.length > 0) && (
                        <div className="text-xs space-y-1 mb-2">
                          {q.correctPoints.length > 0 && (
                            <p className="text-green-700 dark:text-green-400">
                              <span className="font-semibold">Correct: </span>
                              {q.correctPoints.join("; ")}
                            </p>
                          )}
                          {q.incorrectPoints.length > 0 && (
                            <p className="text-red-700 dark:text-red-400">
                              <span className="font-semibold">Incorrect: </span>
                              {q.incorrectPoints.join("; ")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* The examiner's note — Caveat, in the mark's own
                          color, so a correction reads red and a well-done
                          reads green, exactly like a real marked script. */}
                      <p
                        className="text-lg leading-snug"
                        style={{ fontFamily: "var(--font-pen)", color: markColor }}
                      >
                        {q.feedback}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-dashed border-rule p-8 text-center">
          <p className="text-sm text-graphite">
            A per-question breakdown isn&apos;t available for this evaluation — see the topic-wise breakdown below instead.
          </p>
        </div>
      )}

      {/* Charts — genuinely derived from data.marksBreakdown, the same
          array the table below reads, not decoration. Kept, but after the
          marked script and visually quieter than it. */}
      {breakdown.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
            <h2 className="text-sm font-bold text-ink mb-5" style={{ fontFamily: "var(--font-display)" }}>
              Topic-wise marks
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown}>
                  <XAxis dataKey="topic" tick={{ fontSize: 11, fill: "var(--graphite)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--graphite)", fontFamily: "var(--mono-font)" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid var(--rule)", backgroundColor: "var(--paper)", color: "var(--ink)", fontSize: 12 }}
                    formatter={(value) => [`${value}%`, "Score"]}
                  />
                  <Bar
                    dataKey="percentage"
                    fill="var(--ink)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
            <h2 className="text-sm font-bold text-ink mb-5" style={{ fontFamily: "var(--font-display)" }}>
              Performance radar
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={breakdown}>
                  <PolarGrid stroke="var(--rule)" />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: "var(--graphite)" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Marks"
                    dataKey="percentage"
                    stroke="var(--ink)"
                    fill="var(--ink)"
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Topic Detail Table — the rollup. Row ids/highlight mechanism
          unchanged — the AI tutor's "explain this question" cross-link
          targets these exact rows by index. */}
      {breakdown.length > 0 && (
        <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
          <h2 className="text-sm font-bold text-ink mb-5" style={{ fontFamily: "var(--font-display)" }}>
            Topic-wise breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left text-xs font-semibold text-graphite pb-3">Topic</th>
                  <th className="text-right text-xs font-semibold text-graphite pb-3">Marks</th>
                  <th className="text-center text-xs font-semibold text-graphite pb-3">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {breakdown.map((item, idx) => {
                  const isHighlighted = highlightedIndex === idx;
                  return (
                    <tr
                      key={item.topic}
                      id={`breakdown-row-${idx}`}
                      className={`transition-colors duration-500 ${
                        isHighlighted
                          ? "bg-yellow-100/90 dark:bg-yellow-950/40"
                          : "hover:bg-paper dark:hover:bg-gray-800/40"
                      }`}
                    >
                      <td className="py-3 text-sm font-semibold text-ink">{item.topic}</td>
                      <td className="py-3 text-sm text-graphite dark:text-graphite text-right font-mono tabular-nums">
                        {item.obtainedMarks}/{item.totalMarks}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${item.percentage}%`,
                                background:
                                  item.percentage >= 80
                                    ? "var(--tick)"
                                    : item.percentage >= 60
                                    ? "var(--examiner)"
                                    : "var(--examiner)",
                              }}
                            />
                          </div>
                          <span className={`text-xs font-bold font-mono ${
                            item.percentage >= 80
                              ? "text-green-600"
                              : item.percentage >= 60
                              ? "text-amber-600"
                              : "text-red-500"
                          }`}>
                            {item.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Strengths / Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border-l-4 border-green-400 border border-rule card-shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
              Strengths
            </h2>
          </div>
          {(data.strengths || []).length > 0 ? (
            <ul className="space-y-3">
              {(data.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </span>
                  <span className="text-sm text-ink">{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite italic">No specific strengths were identified for this evaluation.</p>
          )}
        </div>

        <div className="bg-surface rounded-2xl border-l-4 border-amber-400 border border-rule card-shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
              Areas to improve
            </h2>
          </div>
          {(data.weaknesses || []).length > 0 ? (
            <ul className="space-y-3">
              {(data.weaknesses || []).map((w, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-amber-600 text-xs">!</span>
                  </span>
                  <span className="text-sm text-ink">{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite italic">No specific areas to improve were identified for this evaluation.</p>
          )}
        </div>
      </div>

      {/* AI Feedback */}
      <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 bg-fixed-ink rounded-xl flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            AI overall feedback
          </h2>
        </div>
        <p className="text-ink leading-relaxed text-sm bg-paper rounded-xl p-4">
          {data.aiFeedback || "Evaluation complete. Review your topic-wise breakdown above for detailed insights."}
        </p>
      </div>

      {/* Recommendations */}
      <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            Study recommendations
          </h2>
        </div>
        {(data.recommendations || []).length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {(data.recommendations || []).map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-amber-50 rounded-xl p-3.5 border border-amber-100"
              >
                <span className="w-6 h-6 bg-amber-400 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-ink">{rec}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-graphite italic">No specific study recommendations were generated for this evaluation.</p>
        )}
      </div>

      {/* Print-Only Layout CSS overrides */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
          }
          /* Hide navigation UI */
          aside, header, nav, button, .no-print, [role="button"], .theme-slider-container {
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
          }
          .flex-1.flex.flex-col, main {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .card-shadow-md {
            box-shadow: none !important;
            border: 1px solid var(--rule) !important;
          }
        }
      `}</style>
      </div>
      
      {/* AI Tutor Collapsible right sidebar */}
      {id && id !== "demo" && <AiTutor evaluationId={id} />}
    </div>
  );
}
