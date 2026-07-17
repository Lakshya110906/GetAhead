"use client";

import { useEffect, useState } from "react";
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
  TrendingUp,
  Target,
} from "lucide-react";

const AiTutor = dynamic(() => import("@/components/tutor/AiTutor").then((m) => m.AiTutor), { ssr: false });

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
    feedback: string;
  }> | null;
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

  // Saved, share and print states
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id || id === "demo") {
      setTimeout(() => {
        setLoading(false);
      }, 0);
      return;
    }
    
    // Fetch report data
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setData({
            ...d,
            strengths: d.strengths || [],
            weaknesses: d.weaknesses || [],
            recommendations: d.recommendations || [],
            marksBreakdown: d.marksBreakdown || [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch save status
    fetch(`/api/reports/save?evaluationId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.saved) {
          setIsSaved(true);
        }
      })
      .catch(() => {});
  }, [id]);

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
          name: `${data.subject} - Evaluation Report`,
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
      title: `${data.subject} Evaluation Report`,
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Brain className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading evaluation results...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
          Evaluation Not Found
        </h2>
        <p className="text-gray-500 text-sm mt-2 mb-6">
          The evaluation report you are trying to access does not exist or you do not have permission to view it.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 gradient-primary text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
            className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
              {data.subject} — Evaluation Report
            </h1>
            <p className="text-gray-500 text-sm">
              {data.grade} • {data.examType} • {new Date(data.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className={`inline-flex items-center gap-2 border text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
              isSaved
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <BookMarked className={`w-4 h-4 ${isSaved ? "fill-green-600 text-green-600" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {shareCopied ? "Copied!" : "Share"}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 gradient-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            PDF / Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Marks Obtained",
            value: `${data.obtainedMarks}/${data.totalMarks}`,
            icon: Target,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Percentage",
            value: `${pct.toFixed(1)}%`,
            icon: TrendingUp,
            color: pct >= 75 ? "text-green-600" : "text-amber-600",
            bg: pct >= 75 ? "bg-green-50" : "bg-amber-50",
          },
          {
            label: "Grade",
            value: grade,
            icon: Award,
            color: grade.startsWith("A") ? "text-green-600" : "text-amber-600",
            bg: grade.startsWith("A") ? "bg-green-50" : "bg-amber-50",
          },
          {
            label: "Topics Covered",
            value: breakdown.length.toString(),
            icon: Brain,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 font-medium">{card.label}</p>
              <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${card.color}`} style={{ fontFamily: "var(--font-poppins)" }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Score Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">Overall Performance</span>
          <span className={`text-sm font-bold ${pct >= 75 ? "text-green-600" : "text-amber-600"}`}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: pct >= 75 ? "linear-gradient(90deg, #22C55E, #14B8A6)" : "linear-gradient(90deg, #F59E0B, #EF4444)",
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>0%</span>
          <span className="text-amber-500 font-medium">Pass: 50%</span>
          <span className="text-green-500 font-medium">Merit: 75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Charts */}
      {breakdown.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
              Topic-wise Marks
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown}>
                  <XAxis dataKey="topic" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(value) => [`${value}%`, "Score"]}
                  />
                  <Bar
                    dataKey="percentage"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
              Performance Radar
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={breakdown}>
                  <PolarGrid stroke="#f0f0f0" />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Marks"
                    dataKey="percentage"
                    stroke="#2563EB"
                    fill="#2563EB"
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Topic Detail Table */}
      {breakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
            Topic-wise Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 pb-3">Topic</th>
                  <th className="text-center text-xs font-semibold text-gray-500 pb-3">Marks</th>
                  <th className="text-center text-xs font-semibold text-gray-500 pb-3">Score</th>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-3 pl-4">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {breakdown.map((item, idx) => {
                  const isHighlighted = highlightedIndex === idx;
                  return (
                    <tr
                      key={item.topic}
                      id={`breakdown-row-${idx}`}
                      className={`transition-colors duration-500 ${
                        isHighlighted
                          ? "bg-yellow-100/90 dark:bg-yellow-950/40"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      }`}
                    >
                      <td className="py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{item.topic}</td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                        {item.obtainedMarks}/{item.totalMarks}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${item.percentage}%`,
                                background:
                                  item.percentage >= 80
                                    ? "#22C55E"
                                    : item.percentage >= 60
                                    ? "#F59E0B"
                                    : "#EF4444",
                              }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${
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
                      <td className="py-3 text-xs text-gray-500 dark:text-gray-400 pl-4">{item.feedback}</td>
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
        <div className="bg-white rounded-2xl border-l-4 border-green-400 border border-gray-100 card-shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
              Strengths
            </h2>
          </div>
          <ul className="space-y-3">
            {(data.strengths || []).map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-xs font-bold">✓</span>
                </span>
                <span className="text-sm text-gray-700">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border-l-4 border-amber-400 border border-gray-100 card-shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
              Areas to Improve
            </h2>
          </div>
          <ul className="space-y-3">
            {(data.weaknesses || []).map((w, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-600 text-xs">!</span>
                </span>
                <span className="text-sm text-gray-700">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Feedback */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
            AI Overall Feedback
          </h2>
        </div>
        <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 rounded-xl p-4">
          {data.aiFeedback || "Evaluation complete. Review your topic-wise breakdown above for detailed insights."}
        </p>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
            Study Recommendations
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(data.recommendations || []).map((rec, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-amber-50 rounded-xl p-3.5 border border-amber-100"
            >
              <span className="w-6 h-6 bg-amber-400 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700">{rec}</p>
            </div>
          ))}
        </div>
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
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>
      </div>
      
      {/* AI Tutor Collapsible right sidebar */}
      {id && id !== "demo" && <AiTutor evaluationId={id} />}
    </div>
  );
}

function Award(props: { className?: string }) {
  return <Target {...props} />;
}
