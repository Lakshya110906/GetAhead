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
  Eye,
  Settings,
  ArrowLeft,
  Search,
  Upload,
  X,
  Sparkles,
} from "lucide-react";
import { GeneratedPaper } from "@/lib/question-agents";
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

// ─── Types ───────────────────────────────────────────────────────────────────
type GenerationStatus = "idle" | "generating" | "complete" | "error";
type AgentStatus = "idle" | "active" | "done" | "error";

interface AgentLogEntry {
  type: "log" | "tool_call" | "tool_result" | "done";
  message: string;
  query?: string;
  ts: number;
}

// ─── AgentCard component ─────────────────────────────────────────────────────
const ACCENT: Record<string, { badge: string; glow: string; ring: string; dot: string; border: string; bg: string }> = {
  blue:   { badge: "bg-blue-100 text-blue-700",    glow: "shadow-blue-500/20",   ring: "ring-blue-500", dot: "bg-blue-500",   border: "border-blue-100", bg: "bg-blue-50" },
  indigo: { badge: "bg-indigo-100 text-indigo-700", glow: "shadow-indigo-500/20", ring: "ring-indigo-500", dot: "bg-indigo-500", border: "border-indigo-100", bg: "bg-indigo-50" },
  purple: { badge: "bg-purple-100 text-purple-700", glow: "shadow-purple-500/20", ring: "ring-purple-500", dot: "bg-purple-500", border: "border-purple-100", bg: "bg-purple-50" },
};

function AgentCard({
  icon, name, role, status, logs, accentColor,
}: {
  icon: string;
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
    <div className={`rounded-2xl border ${c.border} bg-white shadow-md ${status === "active" ? `shadow-lg ${c.glow}` : ""} transition-all duration-500 overflow-hidden flex flex-col`}>
      {/* Card header */}
      <div className={`px-4 py-3 flex items-start gap-3 ${c.bg} border-b ${c.border}`}>
        <span className="text-xl mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: "var(--font-poppins)" }}>{name}</p>
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
              <span className="text-xs font-medium text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">Waiting</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{role}</p>
        </div>
      </div>
      {/* Log feed */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[160px] max-h-[200px] overflow-y-auto p-3 space-y-1.5 bg-gray-950 scrollbar-thin"
      >
        {logs.length === 0 && status === "idle" && (
          <p className="text-gray-600 text-xs italic text-center mt-8">Waiting for activation...</p>
        )}
        {logs.map((entry, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-gray-600 text-xs font-mono shrink-0 mt-px">›</span>
            {entry.type === "tool_call" && (
              <span className="text-xs font-mono">
                <span className="text-yellow-400">🔍 </span>
                <span className="text-yellow-300">{entry.message}</span>
              </span>
            )}
            {entry.type === "tool_result" && (
              <span className="text-xs font-mono">
                <span className="text-green-400">✓ </span>
                <span className="text-green-300">{entry.message}</span>
              </span>
            )}
            {entry.type === "done" && (
              <span className="text-xs font-mono">
                <span className="text-blue-400">✅ </span>
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
            <span className="text-gray-600 text-xs font-mono">›</span>
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
  const [copied, setCopied] = useState(false);

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
  const [institutionName, setInstitutionName] = useState("University Examination Board");
  const [courseCode, setCourseCode] = useState("");
  const [timeAllowed, setTimeAllowed] = useState("2 Hours");
  const [instructions, setInstructions] = useState("1. All questions are compulsory.\n2. Write your Candidate Name and Roll Number clearly at the top right.");

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

  const addLog = (agent: "planner" | "generator" | "reviewer", entry: Omit<AgentLogEntry, "ts">) => {
    const full: AgentLogEntry = { ...entry, ts: Date.now() };
    if (agent === "planner") setPlannerLogs(p => [...p, full]);
    else if (agent === "generator") setGeneratorLogs(p => [...p, full]);
    else setReviewerLogs(p => [...p, full]);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !grade || !topic || questionTypes.length === 0) {
      setError("Please fill in all required fields and select at least one question type.");
      return;
    }

    setError("");
    setStatus("generating");
    setPaper(null);
    setPlannerStatus("idle"); setGeneratorStatus("idle"); setReviewerStatus("idle");
    setPlannerLogs([]); setGeneratorLogs([]); setReviewerLogs([]);

    try {
      const res = await fetch("/api/questions/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, grade, topic, difficulty, totalMarks, questionTypes,
          institutionName, courseCode, timeAllowed, instructions,
          customPrompt, studyMaterialText,
        }),
      });

      if (!res.ok) throw new Error("Failed to connect to generation service.");
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            const { event, agent, message, query } = payload;

            if (event === "agent_start") {
              if (agent === "planner") setPlannerStatus("active");
              else if (agent === "generator") setGeneratorStatus("active");
              else if (agent === "reviewer") setReviewerStatus("active");
              if (message) addLog(agent, { type: "log", message });
            } else if (event === "agent_log") {
              if (message) addLog(agent, { type: "log", message });
            } else if (event === "agent_tool_call") {
              if (query) addLog(agent, { type: "tool_call", message: `Searching: "${query}"`, query });
            } else if (event === "agent_tool_result") {
              if (message) addLog(agent, { type: "tool_result", message });
            } else if (event === "agent_done") {
              if (agent === "planner") setPlannerStatus("done");
              else if (agent === "generator") setGeneratorStatus("done");
              else if (agent === "reviewer") setReviewerStatus("done");
              if (message) addLog(agent, { type: "done", message });
            } else if (event === "complete") {
              const dbPaper = payload.paper;
              setPaperDbId(dbPaper.id);
              const results = JSON.parse(dbPaper.content);
              setPaper(results.paper);
              setPlannerPlan(results.plannerPlan);
              setGeneratorDraft(results.generatorDraft);
              setStatus("complete");
            } else if (event === "error") {
              throw new Error(payload.message || "Generation failed.");
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during generation.";
      setError(msg);
      setStatus("error");
    }
  };

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

      await fetch(`/api/questions/${paperDbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updatedPaper.title,
          content: JSON.stringify(dbPayload)
        })
      });
    } catch (err) {
      console.error("Failed to save paper edits to DB:", err);
    }
  };

  const handleMetadataBlur = () => {
    if (paper) {
      savePaperEdits(paper);
    }
  };

  const handleAIRefine = async () => {
    if (!aiFeedback.trim() || !paper) return;

    setError("");
    setStatus("generating");
    setPlannerStatus("idle"); setGeneratorStatus("idle"); setReviewerStatus("idle");
    setPlannerLogs([]); setGeneratorLogs([]); setReviewerLogs([]);

    const refinementPrompt = `
You are tasked with refining the existing question paper based on the user's revision feedback. Make sure to preserve as much of the existing question paper's structure and formatting as possible, but update the questions, sections, topics, or content to satisfy the revision request.

[User Revision Feedback]:
${aiFeedback}

[Existing Question Paper JSON]:
${JSON.stringify(paper, null, 2)}
`;

    setAiFeedback("");

    try {
      const res = await fetch("/api/questions/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          grade,
          topic,
          difficulty,
          totalMarks,
          questionTypes,
          institutionName,
          courseCode,
          timeAllowed,
          instructions,
          customPrompt: refinementPrompt,
          studyMaterialText,
        }),
      });

      if (!res.ok) throw new Error("Failed to connect to generation service.");
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            const { event, agent, message, query } = payload;

            if (event === "agent_start") {
              if (agent === "planner") setPlannerStatus("active");
              else if (agent === "generator") setGeneratorStatus("active");
              else if (agent === "reviewer") setReviewerStatus("active");
              if (message) addLog(agent, { type: "log", message });
            } else if (event === "agent_log") {
              if (message) addLog(agent, { type: "log", message });
            } else if (event === "agent_tool_call") {
              if (query) addLog(agent, { type: "tool_call", message: `Searching: "${query}"`, query });
            } else if (event === "agent_tool_result") {
              if (message) addLog(agent, { type: "tool_result", message });
            } else if (event === "agent_done") {
              if (agent === "planner") setPlannerStatus("done");
              else if (agent === "generator") setGeneratorStatus("done");
              else if (agent === "reviewer") setReviewerStatus("done");
              if (message) addLog(agent, { type: "done", message });
            } else if (event === "complete") {
              const dbPaper = payload.paper;
              setPaperDbId(dbPaper.id);
              const results = JSON.parse(dbPaper.content);
              setPaper(results.paper);
              setPlannerPlan(results.plannerPlan);
              setGeneratorDraft(results.generatorDraft);
              setStatus("complete");
            } else if (event === "error") {
              throw new Error(payload.message || "Generation failed.");
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during refinement.";
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
        text += `Q${q.number}. ${q.question} (${q.marks} Marks)\n`;
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt, idx) => {
            text += `   ${String.fromCharCode(65 + idx)}. ${opt}\n`;
          });
        }
        if (viewMode === "answers") {
          text += `[Answer: ${q.answer}]\n`;
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2 sm:gap-3" style={{ fontFamily: "var(--font-poppins)" }}>
            <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            AI Question Paper Generator
          </h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">
            Collaborative multi-agent AI designs complete exam papers.
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
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Create New
          </button>
        )}
      </div>

      {status === "idle" && (
        <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-4 sm:p-8 no-print">
          <form onSubmit={handleGenerate} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
                <SubjectSelector
                  value={subject}
                  onChange={setSubject}
                  placeholder="Select or type subject..."
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Level *</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Target Topic / Chapters *</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Calculus: Limits & Continuity, WWI Causes, Organic Carbon Compounds"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cognitive Difficulty *</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Easy", "Medium", "Hard"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                        difficulty === level
                          ? "gradient-primary text-white border-transparent shadow-sm"
                          : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-white hover:text-gray-900"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Marks */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Total Marks (Target) *</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.max(5, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  min="5"
                  max="200"
                  required
                />
              </div>
            </div>

            {/* Question Types */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Question Types (Select one or more) *</label>
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
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
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
            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Custom Paper Style & Special Instructions (Optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Focus on practical programming problems, include code snippets, make the questions highly conceptual, or format in a specific way..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>

            {/* Study Material Upload */}
            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Syllabus / Study Material Upload (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
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
                    <p className="text-sm font-semibold text-gray-700">
                      {uploadingMaterial ? "Extracting document content..." : "Click or drag study materials here"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Supports PDF, TXT, MD, DOCX (max 10MB)</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-green-50/80 border border-green-200/50 rounded-xl">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{studyMaterialFileName}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Successfully loaded • {studyMaterialText.length} characters extracted
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearStudyMaterial}
                    className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm"
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
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                Academic Printing Layout (Optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Institution / School Name</label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Course Code</label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CS-101"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Time Allowed</label>
                  <input
                    type="text"
                    value={timeAllowed}
                    onChange={(e) => setTimeAllowed(e.target.value)}
                    placeholder="e.g. 3 Hours"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Exam Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter custom instructions..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl text-white font-bold gradient-primary shadow-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base"
            >
              <GraduationCap className="w-5 h-5" />
              Generate Question Paper
            </button>
          </form>
        </div>
      )}

      {/* ── Multi-Agent Command Center (Live) ── */}
      {status === "generating" && (
        <div className="space-y-4 no-print">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-poppins)" }}>
                  AI Agent Pipeline Running
                </h2>
                <p className="text-blue-100 text-xs">3 specialized agents collaborating to build your exam paper</p>
              </div>
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
              icon="📅"
              name="Planner Agent"
              role="Designs exam structure & mark distribution"
              status={plannerStatus}
              logs={plannerLogs}
              accentColor="blue"
            />
            {/* ── Generator Agent Card ── */}
            <AgentCard
              icon="✍️"
              name="Generator Agent"
              role="Writes questions, options & model answers"
              status={generatorStatus}
              logs={generatorLogs}
              accentColor="indigo"
            />
            {/* ── Reviewer Agent Card ── */}
            <AgentCard
              icon="🔍"
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
        <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-10 max-w-lg mx-auto text-center no-print">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Generation Failed</h2>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-6 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Paper Presentation Screen */}
      {status === "complete" && paper && (
        <div className="space-y-6">
          {/* Controls toolbar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-3 bg-white border border-gray-100 p-3 sm:p-4 rounded-2xl shadow-sm no-print">
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={() => setViewMode("paper")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === "paper"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FileText className="w-4 h-4" /> Question Paper
              </button>
              <button
                onClick={() => setViewMode("answers")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === "answers"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Eye className="w-4 h-4" /> Answer Key
              </button>
              <button
                onClick={() => setViewMode("logs")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === "logs"
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Settings className="w-4 h-4" /> Agent Logs
              </button>
            </div>

            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 text-gray-700 transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Text"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 gradient-primary px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:opacity-95 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </div>
          </div>

          {/* Clean printable exam container */}
          {viewMode !== "logs" ? (
            <>
              <div className="bg-white rounded-3xl border border-gray-150 shadow-xl p-5 sm:p-10 md:p-14 print-content font-serif">
              {/* Header Title */}
              <div className="text-center pb-2 no-print">
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  onBlur={handleMetadataBlur}
                  className="w-full text-center text-2xl font-bold uppercase tracking-wider text-gray-900 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded px-2 transition-all"
                  style={{ fontFamily: "serif" }}
                />
                <h2 className="text-sm font-bold tracking-wide text-gray-600 uppercase mt-1">
                  Term End Examination • {paper.subject}
                </h2>
              </div>
              <div className="hidden print:block text-center pb-2">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900" style={{ fontFamily: "serif" }}>
                  {institutionName || "UNIVERSITY EXAMINATION BOARD"}
                </h1>
                <h2 className="text-sm font-bold tracking-wide text-gray-600 uppercase mt-1">
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
                      className="bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded px-1 text-xs transition-all w-32 uppercase font-bold"
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
                      className="bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded px-1 text-xs transition-all w-32"
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
                  <strong className="block text-gray-700 not-italic uppercase tracking-wider mb-1 no-print">General Instructions (Click to Edit):</strong>
                  <strong className="hidden print:block text-gray-700 not-italic uppercase tracking-wider mb-1">General Instructions:</strong>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    onBlur={handleMetadataBlur}
                    rows={2}
                    className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded p-1 text-xs text-gray-650 leading-relaxed resize-y font-serif italic no-print"
                  />
                  <div className="hidden print:block whitespace-pre-line text-gray-600">{instructions}</div>
                </div>
              )}

              {/* Sections & Questions */}
              <div className="space-y-8">
                {paper.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-4">
                    <div className="border-b border-gray-300 pb-2">
                      <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">{section.title}</h2>
                      <p className="text-gray-500 text-xs mt-0.5 italic">{section.description}</p>
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
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Question Text</label>
                                  <textarea
                                    value={editQuestionText}
                                    onChange={(e) => setEditQuestionText(e.target.value)}
                                    rows={2}
                                    className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Marks</label>
                                    <input
                                      type="number"
                                      value={editQuestionMarks}
                                      onChange={(e) => setEditQuestionMarks(parseInt(e.target.value) || 0)}
                                      className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Answer Key</label>
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
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">MCQ Options</label>
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
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-150 rounded-lg"
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
                                    className="px-3 py-1.5 text-xs font-bold text-white gradient-primary rounded-lg shadow-sm"
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
                                    {q.question}
                                  </p>
                                  <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                    [{q.marks} Mark{q.marks > 1 ? "s" : ""}]
                                  </span>
                                </div>

                                {/* Options if MCQ */}
                                {q.options && q.options.length > 0 && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pl-6">
                                    {q.options.map((opt, oIdx) => (
                                      <p key={oIdx} className="text-sm text-gray-700">
                                        <span className="font-semibold text-gray-500 mr-2">
                                          {String.fromCharCode(65 + oIdx)}.
                                        </span>
                                        {opt}
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
                                      {q.answer}
                                    </p>
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
            <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-6 mt-6 no-print space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-905" style={{ fontFamily: "var(--font-poppins)" }}>
                    AI Paper Refinement & Tweaks
                  </h3>
                  <p className="text-xs text-gray-500">
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
                  className="inline-flex items-center gap-2 gradient-primary text-white font-semibold text-sm px-5 py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  Apply Tweaks
                </button>
              </div>
            </div>
          </>
        ) : (
            // Agent logs timeline view
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-8 no-print">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-poppins)" }}>
                  Agent Collaborative Audit Trail
                </h2>
                <p className="text-gray-500 text-sm">
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
                  <div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-mono text-gray-600 max-h-60 overflow-auto">
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
                  <div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-mono text-gray-600 max-h-60 overflow-auto">
                    {generatorDraft ? JSON.stringify(generatorDraft, null, 2) : "No generator logs found"}
                  </div>
                </div>

                {/* Reviewer Quality logs */}
                <div className="relative pl-6">
                  <div className="absolute -left-1 top-0.5 w-4 h-4 rounded-full bg-green-500 border-4 border-white" />
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-500" />
                    Quality & Reviewer Audit Notes
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {(paper.reviewNotes || []).map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-green-50 text-green-800 px-4 py-2.5 rounded-xl text-sm font-semibold">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </li>
                    ))}
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
