import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Upload,
  BarChart3,
  FileText,
  Bookmark,
  Download,
  Clipboard,
  Cloud,
  LayoutDashboard,
  GraduationCap,
  Sparkles,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Zap,
  Map,
  ChevronRight,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Features — GetAhead AI",
  description: "Explore every feature of GetAhead AI: AI answer sheet evaluation, question paper generation, performance analytics, saved reports, and more.",
  openGraph: {
    title: "Features — GetAhead AI",
    description: "From AI-powered grading to subject-wise analytics — everything you need to evaluate, improve, and excel.",
    type: "website",
  },
};

const features = [
  {
    icon: Brain,
    id: "ai-evaluation",
    title: "AI Answer Sheet Evaluation",
    tagline: "Grade in seconds, not hours.",
    color: "from-blue-500 to-blue-700",
    bg: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-100",
    what: "Upload any answer sheet — handwritten or typed — and GetAhead AI uses Gemini 2.5 Flash to read, understand, and evaluate every answer with expert-level precision.",
    why: "Manual grading is time-consuming, inconsistent, and often subjective. AI evaluation is fast, consistent, and calibrated against academic rubrics.",
    benefits: [
      "Grade hundreds of sheets in the time it takes to grade one manually",
      "Consistent scoring — no fatigue, no bias",
      "Detailed marks breakdown per question",
      "Supports MCQ, descriptive, and mixed paper formats",
    ],
    howItWorks: "After upload, our OCR engine extracts text from your sheet. The extracted content is then passed to Gemini 2.5 Flash with subject-specific evaluation rubrics. The AI scores each answer, identifies errors, and produces a structured marks breakdown — all in under 30 seconds.",
    workflow: "Upload PDF → OCR extraction → Gemini evaluation → Marks + feedback in dashboard",
  },
  {
    icon: GraduationCap,
    id: "question-paper-generator",
    title: "AI Question Paper Generator",
    tagline: "Create exam-ready papers in 60 seconds.",
    color: "from-purple-500 to-purple-700",
    bg: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-100",
    what: "Select subject, grade, difficulty level, and total marks. GetAhead AI generates a complete, structured question paper with a variety of question types — instantly.",
    why: "Teachers spend hours crafting papers. With AI, you get a balanced, well-structured paper that covers the syllabus at your chosen difficulty — in under a minute.",
    benefits: [
      "Customise by subject, grade, and difficulty (Easy / Medium / Hard)",
      "Covers objective, short-answer, and long-answer formats",
      "Balanced mark distribution automatically applied",
      "Download as formatted text ready to paste or print",
    ],
    howItWorks: "Enter your requirements — subject (e.g., Physics Class 12), grade, difficulty, and total marks. Gemini 2.5 Flash generates a full question paper following standard exam formats. You can regenerate instantly if you want a different version.",
    workflow: "Select subject & grade → Set difficulty & marks → Generate → Download / Copy",
  },
  {
    icon: MessageSquare,
    id: "ai-feedback",
    title: "AI-Powered Feedback",
    tagline: "Not just marks — actionable improvement guidance.",
    color: "from-teal-500 to-teal-700",
    bg: "bg-teal-50",
    textColor: "text-teal-700",
    borderColor: "border-teal-100",
    what: "After every evaluation, GetAhead AI generates a personalised feedback report highlighting strengths, weaknesses, conceptual errors, and specific study recommendations.",
    why: "Knowing your score doesn't tell you how to improve. AI feedback pinpoints exactly where you went wrong and what to study next.",
    benefits: [
      "Identifies conceptual gaps vs. careless mistakes",
      "Subject-specific study recommendations",
      "Strengths highlighted to build confidence",
      "Actionable next steps rather than generic advice",
    ],
    howItWorks: "The same AI pass that scores your answers also analyses the pattern of errors. If you consistently lose marks on integration but excel at differentiation, the feedback will tell you exactly that — and recommend targeted revision.",
    workflow: "Evaluation completes → AI identifies patterns → Feedback generated → Shown in dashboard",
  },
  {
    icon: BarChart3,
    id: "performance-analytics",
    title: "Performance Analytics",
    tagline: "See your progress over time, not just today.",
    color: "from-orange-500 to-orange-700",
    bg: "bg-orange-50",
    textColor: "text-orange-700",
    borderColor: "border-orange-100",
    what: "The Analytics dashboard shows your performance trends across all evaluations — monthly score trends, subject-wise averages, and recent evaluation history.",
    why: "Isolated scores don't tell you if you're actually improving. Trends show you the real picture — which subjects are improving, which are stagnating, and what to focus on.",
    benefits: [
      "Monthly performance trend charts",
      "Subject-wise average scores",
      "Completion rate tracking",
      "Saved report summaries at a glance",
    ],
    howItWorks: "Every completed evaluation feeds into your analytics. Charts are generated dynamically from your actual data — no manual input required.",
    workflow: "Complete evaluations → Analytics auto-update → View trends in dashboard",
  },
  {
    icon: FileText,
    id: "subject-reports",
    title: "Subject-wise Reports",
    tagline: "Drill down into every subject, every question.",
    color: "from-green-500 to-green-700",
    bg: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-100",
    what: "Each evaluation generates a detailed report broken down by subject, topic, and individual question — including the marks awarded, expected answer, and AI rationale for each score.",
    why: "Aggregate scores hide the detail. Subject-wise reports let you see exactly which topics cost you marks.",
    benefits: [
      "Per-question marks with AI reasoning",
      "Expected vs. given answer comparison",
      "Topic-level performance summary",
      "Shareable report links",
    ],
    howItWorks: "The AI structures marks breakdown as a JSON object per question. This is stored and rendered as a visual report in your dashboard, with expandable sections per subject.",
    workflow: "Evaluation completes → Report available → View by subject → Drill into questions",
  },
  {
    icon: Bookmark,
    id: "saved-reports",
    title: "Saved Reports",
    tagline: "Bookmark your best evaluations for quick reference.",
    color: "from-pink-500 to-pink-700",
    bg: "bg-pink-50",
    textColor: "text-pink-700",
    borderColor: "border-pink-100",
    what: "Save any completed evaluation report for future reference. Saved reports are pinned to your dashboard and accessible anytime.",
    why: "Important evaluations like mock tests or final exams should be easy to find. Saved reports let you build a personal archive of key assessments.",
    benefits: [
      "One-click save from any evaluation",
      "Custom name for each saved report",
      "Quick access from dashboard sidebar",
      "Unsave anytime to keep your list clean",
    ],
    howItWorks: "Click 'Save Report' on any evaluation. You can optionally name it (e.g. 'Physics Mock Test 3 — April'). Saved reports appear in the Saved Reports section of your dashboard.",
    workflow: "Complete evaluation → Click Save → Name it → Access anytime from sidebar",
  },
  {
    icon: Download,
    id: "pdf-export",
    title: "PDF Export",
    tagline: "Take your report offline, share with teachers.",
    color: "from-sky-500 to-sky-700",
    bg: "bg-sky-50",
    textColor: "text-sky-700",
    borderColor: "border-sky-100",
    what: "Export any evaluation report as a professionally formatted PDF — including marks breakdown, AI feedback, strengths, weaknesses, and study recommendations.",
    why: "Digital reports are useful. But for parent-teacher meetings, offline revision, or submission to institutions, a PDF is essential.",
    benefits: [
      "Full report including all sections",
      "Clean, print-ready formatting",
      "Includes AI feedback and recommendations",
      "Instant download from dashboard",
    ],
    howItWorks: "On any completed evaluation page, click 'Download Report'. The report is rendered as a styled PDF with your name, date, subject, and full evaluation detail.",
    workflow: "Open evaluation → Click Download → PDF generated → Saved to device",
  },
  {
    icon: Clipboard,
    id: "clipboard-support",
    title: "Clipboard Support",
    tagline: "Copy questions and content in one click.",
    color: "from-indigo-500 to-indigo-700",
    bg: "bg-indigo-50",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-100",
    what: "Any generated question paper can be copied to clipboard instantly — ready to paste into Google Docs, Word, or your school's exam system.",
    why: "You shouldn't have to manually retype AI-generated content. One-click copy makes the workflow seamless.",
    benefits: [
      "Copy entire question paper in one click",
      "Preserves formatting where possible",
      "Works on desktop and mobile browsers",
      "Visual confirmation when copied",
    ],
    howItWorks: "On the Generate Paper page, after generating a paper, click the 'Copy to Clipboard' button. The full paper text is copied — ready to paste wherever you need it.",
    workflow: "Generate paper → Click Copy → Paste into Docs / Print system",
  },
  {
    icon: Cloud,
    id: "secure-storage",
    title: "Secure Cloud Storage",
    tagline: "All your evaluations, safe and accessible.",
    color: "from-cyan-500 to-cyan-700",
    bg: "bg-cyan-50",
    textColor: "text-cyan-700",
    borderColor: "border-cyan-100",
    what: "Every evaluation, report, and question paper is stored securely in your account. Access them from any device, any time.",
    why: "Losing evaluation data means losing your progress history. Cloud storage ensures your data is never on a single device.",
    benefits: [
      "Persistent storage across all sessions",
      "Access from any browser or device",
      "Data encrypted in transit (HTTPS/TLS)",
      "No storage limits for evaluations",
    ],
    howItWorks: "When you upload and evaluate, all results are saved to our MySQL database hosted on Aiven Cloud — encrypted at rest and in transit. Your account is protected with secure session authentication.",
    workflow: "Evaluate → Data stored → Access from anywhere → Always available",
  },
  {
    icon: LayoutDashboard,
    id: "dashboard",
    title: "Dashboard",
    tagline: "Your command centre for academic performance.",
    color: "from-slate-500 to-slate-700",
    bg: "bg-slate-50",
    textColor: "text-slate-700",
    borderColor: "border-slate-100",
    what: "The dashboard is your central hub — showing recent evaluations, performance stats, saved reports, and quick access to all features in one clean interface.",
    why: "Scattered data is useless. The dashboard brings everything together so you can understand your performance at a glance and act on it immediately.",
    benefits: [
      "Quick stats: total evaluations, average score, completed count",
      "Recent evaluation history",
      "Quick links to upload, generate, and analytics",
      "Dark mode and theme personalisation",
    ],
    howItWorks: "Your dashboard is populated automatically from your account data. Stats update as you complete evaluations. The sidebar gives instant access to every section of the app.",
    workflow: "Login → Dashboard loads → See your stats → Navigate to any feature",
  },
  {
    icon: Map,
    id: "roadmap",
    title: "Future Roadmap",
    tagline: "What's coming next for GetAhead AI.",
    color: "from-violet-500 to-violet-700",
    bg: "bg-violet-50",
    textColor: "text-violet-700",
    borderColor: "border-violet-100",
    what: "GetAhead AI is actively developed. Here's what's planned for the next phases.",
    why: "We build based on real student and teacher feedback. The roadmap reflects what users actually need.",
    benefits: [
      "Bulk upload for teachers (multiple sheets at once)",
      "Google Classroom integration",
      "Sharable student-teacher report links",
      "Parent portal with progress summaries",
      "CBSE, ICSE, and IB rubric presets",
      "WhatsApp / email delivery of reports",
      "Speech-to-text answer submission",
      "API for institutional integration",
    ],
    howItWorks: "Roadmap features are released in batches. Expect 2–3 major features per quarter. Priority is given to features that save teachers the most time.",
    workflow: "Suggest a feature via Contact → We evaluate demand → Build and release",
  },
];

export default function FeaturesPage() {
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
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            Powered by Gemini 2.5 Flash
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
            Everything you need to<br />
            <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">evaluate and excel</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            GetAhead AI combines AI evaluation, smart analytics, and question generation into a single platform built for students, teachers, and institutions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20">
              Start Free — No Card Required <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-gray-700 font-medium px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
              See How It Works <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick links to features */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {features.map((f) => (
              <a key={f.id} href={`#${f.id}`} className="text-sm text-gray-600 hover:text-blue-600 bg-white border border-gray-200 hover:border-blue-200 px-3 py-1.5 rounded-lg transition-all">
                {f.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-24">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={feature.id} id={feature.id} className="scroll-mt-24">
                <div className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-12 items-start`}>
                  {/* Content */}
                  <div className="flex-1">
                    <div className={`inline-flex items-center gap-2 ${feature.bg} ${feature.textColor} text-sm font-semibold px-3 py-1.5 rounded-lg mb-4`}>
                      <Icon className="w-4 h-4" />
                      Feature
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
                      {feature.title}
                    </h2>
                    <p className="text-lg text-gray-500 mb-6 font-medium">{feature.tagline}</p>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">What it does</h3>
                        <p className="text-gray-600 leading-relaxed">{feature.what}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Why it matters</h3>
                        <p className="text-gray-600 leading-relaxed">{feature.why}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Benefits</h3>
                        <ul className="space-y-2">
                          {feature.benefits.map((b, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                              <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${feature.textColor}`} />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Card */}
                  <div className={`w-full lg:w-80 flex-shrink-0 border ${feature.borderColor} rounded-2xl overflow-hidden shadow-sm`}>
                    <div className={`bg-gradient-to-br ${feature.color} p-8 flex items-center justify-center`}>
                      <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <div className="p-6 bg-white">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How it works</h4>
                      <p className="text-sm text-gray-700 leading-relaxed mb-4">{feature.howItWorks}</p>
                      <div className={`${feature.bg} border ${feature.borderColor} rounded-lg p-3`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Workflow</p>
                        <p className={`text-xs font-medium ${feature.textColor} leading-relaxed`}>{feature.workflow}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 mt-8 bg-gradient-to-br from-blue-600 to-teal-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Zap className="w-12 h-12 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Ready to use every feature?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Create a free account and start evaluating answer sheets in under 2 minutes.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-lg group">
            Get Started Free
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
