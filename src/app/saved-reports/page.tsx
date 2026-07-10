"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  FileText,
  ExternalLink,
  PlusCircle,
  Printer,
  Copy,
  Trash2,
  Eye,
  X,
  CheckCircle,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { GeneratedPaper } from "@/lib/question-agents";

interface SavedPaper {
  id: string;
  subject: string;
  grade: string;
  difficulty: string;
  totalMarks: number;
  title: string;
  content: string; // JSON string of Planner/Generator/Reviewer result
  createdAt: string;
}

interface SavedReportWithEvaluation {
  id: string;
  userId: string;
  evaluationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  evaluation?: {
    id: string;
    userId: string;
    examType: string;
    subject: string;
    grade: string | null;
    totalMarks: number | null;
    obtainedMarks: number | null;
    percentage: number | null;
    status: string;
    originalFileName: string | null;
    fileUrl: string | null;
    fileType: string | null;
    ocrText: string | null;
    aiResponse: string | null;
    marksBreakdown: string | null;
    aiFeedback: string | null;
    strengths: string | null;
    weaknesses: string | null;
    recommendations: string | null;
    createdAt: string;
    updatedAt: string;
  };
}


export default function SavedReportsPage() {
  const [activeTab, setActiveTab] = useState<"reports" | "papers">("reports");
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  // Real saved reports state
  const [savedReports, setSavedReports] = useState<SavedReportWithEvaluation[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  
  // Modal Previewer State
  const [selectedPaper, setSelectedPaper] = useState<SavedPaper | null>(null);
  const [parsedPaperContent, setParsedPaperContent] = useState<{
    paper: GeneratedPaper;
    plannerPlan: unknown;
    generatorDraft: unknown;
    metadata?: {
      institutionName?: string;
      courseCode?: string;
      timeAllowed?: string;
      instructions?: string;
    };
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<"paper" | "answers">("paper");

  const fetchPapers = async () => {
    setLoadingPapers(true);
    try {
      const res = await fetch("/api/questions");
      const data = await res.json();
      if (res.ok && data.success) {
        setPapers(data.papers);
      }
    } catch (err) {
      console.error("Failed to fetch papers:", err);
    } finally {
      setLoadingPapers(false);
    }
  };

  const fetchSavedReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/reports/save");
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedReports(data.savedReports);
      }
    } catch (err) {
      console.error("Failed to fetch saved reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === "papers") {
      const timer = setTimeout(() => {
        fetchPapers();
      }, 0);
      return () => clearTimeout(timer);
    } else if (activeTab === "reports") {
      const timer = setTimeout(() => {
        fetchSavedReports();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const handleOpenPaper = (paperItem: SavedPaper) => {
    try {
      const parsed = JSON.parse(paperItem.content);
      setSelectedPaper(paperItem);
      setParsedPaperContent(parsed);
      setPreviewMode("paper");
    } catch (err) {
      console.error("Failed to parse paper content:", err);
    }
  };

  const handleDeletePaper = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this question paper?")) return;
    
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPapers(papers.filter((p) => p.id !== id));
        if (selectedPaper?.id === id) {
          setSelectedPaper(null);
          setParsedPaperContent(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete paper:", err);
    }
  };

  const handleCopy = () => {
    if (!parsedPaperContent) return;
    const paperObj = parsedPaperContent.paper;
    
    let text = `${paperObj.title}\nSubject: ${paperObj.subject} | Grade: ${paperObj.grade}\nDifficulty: ${paperObj.difficulty} | Total Marks: ${paperObj.totalMarks}\n\n`;
    
    paperObj.sections.forEach((section) => {
      text += `--- ${section.title} ---\n${section.description}\n\n`;
      section.questions.forEach((q) => {
        text += `Q${q.number}. ${q.question} (${q.marks} Marks)\n`;
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt, idx) => {
            text += `   ${String.fromCharCode(65 + idx)}. ${opt}\n`;
          });
        }
        if (previewMode === "answers") {
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
    <div className="space-y-6">
      {/* Print-only CSS style overrides */}
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
          /* Hide all UI elements except the modal print content */
          aside, header, nav, button, form, .no-print, .modal-backdrop, [role="button"], .modal-backdrop button, .modal-container button {
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
          .modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
            max-height: none !important;
            overflow: visible !important;
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

      {/* Page Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
            Saved Repository
          </h1>
          <p className="text-gray-500 text-sm">All your evaluations and generated assets in one place</p>
        </div>
        
        {activeTab === "reports" ? (
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 gradient-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            New Evaluation
          </Link>
        ) : (
          <Link
            href="/generate-paper"
            className="inline-flex items-center gap-2 gradient-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            Generate Paper
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 no-print">
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "reports"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Evaluation Reports
        </button>
        <button
          onClick={() => setActiveTab("papers")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "papers"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Generated Papers
        </button>
      </div>

      {/* Content tabs */}
      {activeTab === "reports" ? (
        <div className="no-print">
          {loadingReports ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
          ) : savedReports.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-150 p-12 text-center max-w-lg mx-auto shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookMarked className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-poppins)" }}>
                No Saved Reports Yet
              </h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
                When you evaluate an exam answer sheet, you can save the results here to build your academic repository.
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 gradient-primary text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md"
              >
                <FileText className="w-4 h-4" /> Start First Evaluation
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedReports.map((saved) => {
                const report = saved.evaluation;
                if (!report) return null;
                const pct = report.percentage || 0;
                const formattedDate = new Date(report.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                });
                return (
                  <div
                    key={saved.id}
                    className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-5 hover:card-shadow-lg hover:-translate-y-0.5 transition-all group relative"
                  >
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!confirm("Remove this report from saved repository?")) return;
                        await fetch("/api/reports/save", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ evaluationId: report.id })
                        });
                        fetchSavedReports();
                      }}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 p-1.5 rounded-xl hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Unsave Report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {report.subject.slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          pct >= 80
                            ? "bg-green-100 text-green-700"
                            : pct >= 60
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-0.5" style={{ fontFamily: "var(--font-poppins)" }}>
                      {report.subject}
                    </h3>
                    <p className="text-gray-500 text-xs mb-4">{report.grade} • {formattedDate}</p>

                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 80 ? "#22C55E" : pct >= 60 ? "#F59E0B" : "#EF4444",
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <BookMarked className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-blue-600 font-semibold">Saved Report</span>
                      </div>
                      <Link
                        href={`/evaluation/${report.id}`}
                        className="inline-flex items-center gap-1.5 text-blue-600 text-xs font-semibold"
                      >
                        View <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Question Papers tab view
        <div className="no-print">
          {loadingPapers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
          ) : papers.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl max-w-lg mx-auto">
              <GraduationCap className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
                No saved question papers
              </h3>
              <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                Generate tailored question papers with automated planning and reviewer agents.
              </p>
              <Link
                href="/generate-paper"
                className="inline-flex items-center gap-2 gradient-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl mt-6 hover:opacity-90 shadow-md"
              >
                <PlusCircle className="w-4 h-4" /> Generate First Paper
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {papers.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenPaper(p)}
                  className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-5 hover:card-shadow-lg hover:-translate-y-0.5 transition-all group cursor-pointer relative"
                >
                  <button
                    onClick={(e) => handleDeletePaper(p.id, e)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 p-1.5 rounded-xl hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">
                      {p.subject.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        p.difficulty === "Easy"
                          ? "bg-green-50 text-green-700 border border-green-150"
                          : p.difficulty === "Medium"
                          ? "bg-amber-50 text-amber-700 border border-amber-150"
                          : "bg-red-50 text-red-700 border border-red-150"
                      }`}
                    >
                      {p.difficulty}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm truncate pr-6" style={{ fontFamily: "var(--font-poppins)" }}>
                    {p.title}
                  </h3>
                  <p className="text-gray-500 text-xs mb-4">
                    {p.grade} • {p.totalMarks} Marks
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      <span>Exam Paper</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-blue-600 text-xs font-semibold">
                      View Paper <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Screen Previewer Modal */}
      {selectedPaper && parsedPaperContent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 modal-backdrop">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col modal-container">
            {/* Modal Toolbar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 no-print flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode("paper")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    previewMode === "paper"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Question Paper
                </button>
                <button
                  onClick={() => setPreviewMode("answers")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    previewMode === "answers"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Answer Key
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gray-700 hover:bg-gray-100"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Text"}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1 gradient-primary text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow hover:opacity-95"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button
                  onClick={() => {
                    setSelectedPaper(null);
                    setParsedPaperContent(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: The Exam paper layout */}
            <div className="flex-1 p-10 md:p-14 overflow-y-auto print-content font-serif">
              {/* Header Title */}
              <div className="text-center pb-2">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900" style={{ fontFamily: "serif" }}>
                  {parsedPaperContent.metadata?.institutionName || "UNIVERSITY EXAMINATION BOARD"}
                </h1>
                <h2 className="text-sm font-bold tracking-wide text-gray-600 uppercase mt-1">
                  Term End Examination • {parsedPaperContent.paper.subject}
                </h2>
              </div>

              {/* Student Identity and Exam Details Grid */}
              <div className="border-t-2 border-b-2 border-gray-800 py-4 my-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                {/* Left Side: Exam Metadata */}
                <div className="space-y-1 text-left">
                  {parsedPaperContent.metadata?.courseCode && (
                    <div><strong>Course Code:</strong> {parsedPaperContent.metadata.courseCode.toUpperCase()}</div>
                  )}
                  <div><strong>Grade/Class:</strong> {parsedPaperContent.paper.grade}</div>
                  <div><strong>Time Allowed:</strong> {parsedPaperContent.metadata?.timeAllowed || "2 Hours"}</div>
                  <div><strong>Difficulty Level:</strong> {parsedPaperContent.paper.difficulty}</div>
                  <div><strong>Total Marks:</strong> {parsedPaperContent.paper.totalMarks} Marks</div>
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
              {parsedPaperContent.metadata?.instructions && (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-8 text-xs italic text-left">
                  <strong className="block text-gray-700 not-italic uppercase tracking-wider mb-1">General Instructions:</strong>
                  <div className="whitespace-pre-line text-gray-600">{parsedPaperContent.metadata.instructions}</div>
                </div>
              )}

              {/* Sections & Questions */}
              <div className="space-y-8 text-left">
                {parsedPaperContent.paper.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-4">
                    <div className="border-b border-gray-300 pb-2">
                      <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">{section.title}</h2>
                      <p className="text-gray-500 text-xs mt-0.5 italic">{section.description}</p>
                    </div>

                    <div className="space-y-6">
                      {section.questions.map((q) => (
                        <div key={q.number} className="relative pl-2 question-block">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-gray-900 font-medium flex-1">
                              <span className="font-bold mr-1.5">Q{q.number}.</span>
                              {q.question}
                            </p>
                            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                              [{q.marks} Mark{q.marks > 1 ? "s" : ""}]
                            </span>
                          </div>

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

                          {previewMode === "answers" && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl no-print">
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                                Correct Answer / Evaluator Rubric:
                              </p>
                              <p className="text-sm text-blue-900 font-medium">{q.answer}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

