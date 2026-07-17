"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Brain,
  ArrowRight,
  ChevronRight,
  UserPlus,
  Mail,
  LogIn,
  Upload,
  Scan,
  Cpu,
  Star,
  MessageSquare,
  TrendingUp,
  Bookmark,
  FileText,
  GraduationCap,
  Download,
  CheckCircle,
  Zap,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up with your email address and choose your role — Student, Teacher, or Institution. Takes under 60 seconds. No credit card required, ever.",
    detail: "Your account is created with a secure hashed password (bcrypt, 12 rounds). We never store your plain-text password.",
    color: "from-blue-500 to-blue-700",
    bg: "bg-blue-50",
    textColor: "text-blue-700",
  },
  {
    number: "02",
    icon: Mail,
    title: "Verify Your Email",
    description: "Check your inbox for a verification email from GetAhead AI. Click the link to activate your account and gain full access.",
    detail: "Verification links expire after 24 hours. You can request a new link from the login page if needed.",
    color: "from-indigo-500 to-indigo-700",
    bg: "bg-indigo-50",
    textColor: "text-indigo-700",
  },
  {
    number: "03",
    icon: LogIn,
    title: "Sign In to Dashboard",
    description: "Log in with your verified email and password. You'll land on your personalised dashboard showing your evaluation history and performance stats.",
    detail: "Sessions are stored securely in the database and expire automatically. You can stay signed in across devices.",
    color: "from-violet-500 to-violet-700",
    bg: "bg-violet-50",
    textColor: "text-violet-700",
  },
  {
    number: "04",
    icon: Upload,
    title: "Upload Your Answer Sheet",
    description: "Navigate to 'New Evaluation'. Select your subject, grade, and exam type (MCQ, Descriptive, or Mixed). Upload your PDF or image file.",
    detail: "Supported formats: PDF, JPEG, PNG. For best results, ensure the scan is clear and well-lit. Handwritten answers are supported.",
    color: "from-teal-500 to-teal-700",
    bg: "bg-teal-50",
    textColor: "text-teal-700",
  },
  {
    number: "05",
    icon: Scan,
    title: "AI Extracts Your Answers",
    description: "Our OCR engine reads your answer sheet — both typed and handwritten. The extracted text is structured for evaluation.",
    detail: "OCR uses advanced text recognition tuned for academic content. Numbers, equations, diagrams (described), and structured answers are all handled.",
    color: "from-green-500 to-green-700",
    bg: "bg-green-50",
    textColor: "text-green-700",
  },
  {
    number: "06",
    icon: Cpu,
    title: "Gemini AI Evaluates",
    description: "Gemini 2.5 Flash reads every answer against subject-specific rubrics. It scores each question, identifies errors, and understands partial credit.",
    detail: "Evaluation is context-aware — a correct method with a calculation error gets partial credit. The AI understands academic language, not just keyword matching.",
    color: "from-orange-500 to-orange-700",
    bg: "bg-orange-50",
    textColor: "text-orange-700",
  },
  {
    number: "07",
    icon: Star,
    title: "Marks Generated",
    description: "Each question receives a score. Total marks and percentage are calculated instantly. The breakdown is stored in your evaluation record.",
    detail: "Marks breakdown is stored as structured data — you can see obtained vs. maximum marks per question, per section, and for the whole paper.",
    color: "from-yellow-500 to-yellow-700",
    bg: "bg-yellow-50",
    textColor: "text-yellow-700",
  },
  {
    number: "08",
    icon: MessageSquare,
    title: "Feedback Generated",
    description: "Alongside marks, the AI generates a personalised feedback report: strengths, weaknesses, conceptual errors, and specific study recommendations.",
    detail: "Feedback is not generic — it's tied to your actual answers. If you misidentified a chemical reaction, the feedback will tell you exactly which reaction and why it was incorrect.",
    color: "from-pink-500 to-pink-700",
    bg: "bg-pink-50",
    textColor: "text-pink-700",
  },
  {
    number: "09",
    icon: TrendingUp,
    title: "Performance Analysis",
    description: "Your Analytics dashboard updates automatically. See monthly score trends, subject-wise averages, and compare your performance over time.",
    detail: "Analytics are computed from all your completed evaluations. The more you evaluate, the richer your trend data becomes.",
    color: "from-cyan-500 to-cyan-700",
    bg: "bg-cyan-50",
    textColor: "text-cyan-700",
  },
  {
    number: "10",
    icon: Bookmark,
    title: "Save Important Reports",
    description: "Found a particularly useful evaluation? Save it to your Saved Reports with a custom name for quick future reference.",
    detail: "Saved reports are pinned in your dashboard sidebar. Great for bookmarking mock test results, board exam practice papers, and milestone evaluations.",
    color: "from-rose-500 to-rose-700",
    bg: "bg-rose-50",
    textColor: "text-rose-700",
  },
  {
    number: "11",
    icon: GraduationCap,
    title: "Generate Question Papers",
    description: "Need to practise? Head to Generate Paper. Choose subject, grade, difficulty, and marks — get a complete, structured question paper instantly.",
    detail: "Generated papers follow standard exam structures with a mix of objective, short-answer, and long-answer questions proportional to the marks you specified.",
    color: "from-purple-500 to-purple-700",
    bg: "bg-purple-50",
    textColor: "text-purple-700",
  },
  {
    number: "12",
    icon: Download,
    title: "Download & Share Reports",
    description: "Export any evaluation report as a PDF. Share it with your teacher, use it in a parent-teacher meeting, or keep it for offline revision.",
    detail: "PDF reports include your name, date, subject, marks breakdown, AI feedback, strengths, weaknesses, and study recommendations — all in one clean document.",
    color: "from-slate-500 to-slate-700",
    bg: "bg-slate-50",
    textColor: "text-slate-700",
  },
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
              Get<span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Ahead</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">Sign In</Link>
            <Link href="/signup" className="text-sm bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-blue-50/40 to-teal-50/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            Evaluate in under 30 seconds
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
            From upload to insights —<br />
            <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">here&apos;s exactly how it works</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            GetAhead AI is designed to be fast and simple. Follow the 12-step journey from account creation to downloading your first report.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500">
            {["No setup required", "No credit card", "Works on mobile", "Results in seconds"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 text-teal-500" />{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-blue-200 via-teal-200 to-purple-200 hidden lg:block" />

          <div className="space-y-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isOpen = activeStep === idx;
              return (
                <div key={step.number} className="relative lg:pl-20">
                  {/* Step number circle */}
                  <div className={`hidden lg:flex absolute left-0 top-4 w-12 h-12 rounded-full bg-gradient-to-br ${step.color} items-center justify-center shadow-lg text-white font-bold text-sm z-10`}>
                    {step.number}
                  </div>

                  <button
                    onClick={() => setActiveStep(isOpen ? null : idx)}
                    className="w-full text-left group"
                    aria-expanded={isOpen}
                  >
                    <div className={`bg-white border rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all ${isOpen ? "border-blue-200 shadow-md" : "border-gray-100 shadow-sm"}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-sm lg:hidden`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className={`w-10 h-10 rounded-xl ${step.bg} hidden lg:flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${step.textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <span className={`text-xs font-bold uppercase tracking-wide ${step.textColor} block mb-0.5`}>Step {step.number}</span>
                              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
                                {step.title}
                              </h3>
                            </div>
                            <ChevronRight className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                          </div>
                          <p className="text-gray-600 text-sm mt-2 leading-relaxed">{step.description}</p>
                          {isOpen && (
                            <div className={`mt-4 p-4 ${step.bg} border ${step.textColor.replace("text-", "border-").replace("-700", "-200")} rounded-xl`}>
                              <p className={`text-sm ${step.textColor} leading-relaxed`}>{step.detail}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10" style={{ fontFamily: "var(--font-poppins)" }}>
            The complete GetAhead AI experience
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Upload, label: "Upload answer sheet", sub: "PDF, JPEG, PNG" },
              { icon: Cpu, label: "AI evaluates", sub: "Gemini 2.5 Flash" },
              { icon: FileText, label: "Detailed report", sub: "Marks + feedback" },
              { icon: TrendingUp, label: "Track progress", sub: "Analytics dashboard" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-teal-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Ready to try it yourself?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Create a free account in 60 seconds and upload your first answer sheet today.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-lg group">
            Start Free Today <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
