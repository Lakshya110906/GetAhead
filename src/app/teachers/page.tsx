import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Clock,
  BarChart3,
  FileText,
  Users,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Zap,
  Shield,
  Download,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "For Teachers — GetAhead AI",
  description: "GetAhead AI helps teachers evaluate answer sheets faster, generate question papers instantly, and get AI-consistent grading across an entire class.",
  openGraph: {
    title: "For Teachers — GetAhead AI",
    description: "Save hours of manual grading. Get AI-consistent evaluation, question paper generation, and class-wide analytics.",
    type: "website",
  },
};

export default function TeachersPage() {
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
      <section className="pt-32 pb-20 bg-gradient-to-br from-teal-50 via-green-50/30 to-blue-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <GraduationCap className="w-4 h-4" />
                Built for educators
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
                Grade smarter.<br />
                <span className="bg-gradient-to-r from-teal-600 to-blue-500 bg-clip-text text-transparent">Teach better.</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                GetAhead AI evaluates your students&apos; answer sheets with the consistency of an expert examiner — in seconds, not hours. Free your time for what matters: teaching.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-blue-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg">
                  Start Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/features" className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-medium px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                  See All Features <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-500" />
                Time saved per teacher per week
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Manual grading (30 sheets)", old: "4–6 hours", new: "30 minutes" },
                  { label: "Paper creation", old: "1–2 hours", new: "60 seconds" },
                  { label: "Feedback writing", old: "2–3 hours", new: "Auto-generated" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{row.label}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400 line-through">{row.old}</span>
                      <span className="text-teal-600 font-semibold">{row.new}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-teal-50 rounded-xl p-4 border border-teal-100">
                <p className="text-sm font-semibold text-teal-800">Save 5–10 hours every week</p>
                <p className="text-xs text-teal-600 mt-1">That&apos;s 20–40 hours per month you can reinvest in teaching.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Why teachers use GetAhead AI
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            From evaluation to paper generation to class analytics — everything a teacher needs in one platform.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: "Instant Evaluation",
              description: "Evaluate a student's answer sheet in under 30 seconds. No more taking papers home to mark on weekends.",
              color: "from-teal-500 to-teal-600",
            },
            {
              icon: Shield,
              title: "Consistent Grading",
              description: "AI applies the same rubric every time — no fatigue, no subjectivity, no variation between the first and fiftieth sheet.",
              color: "from-blue-500 to-blue-600",
            },
            {
              icon: BarChart3,
              title: "Class-wide Analytics",
              description: "See subject-wise performance trends across your evaluations. Identify which topics your students consistently struggle with.",
              color: "from-purple-500 to-purple-600",
            },
            {
              icon: GraduationCap,
              title: "Question Paper Generation",
              description: "Create balanced, well-structured papers in 60 seconds. Select subject, grade, difficulty, and marks — the AI does the rest.",
              color: "from-orange-500 to-orange-600",
            },
            {
              icon: Download,
              title: "Shareable PDF Reports",
              description: "Export evaluation reports as PDFs to share with students or parents. Professional formatting — ready for parent-teacher meetings.",
              color: "from-pink-500 to-pink-600",
            },
            {
              icon: FileText,
              title: "Detailed Marks Breakdown",
              description: "Every evaluation includes a per-question breakdown with the AI's reasoning — so you can review and override if needed.",
              color: "from-indigo-500 to-indigo-600",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12" style={{ fontFamily: "var(--font-poppins)" }}>
            A typical teacher workflow
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Collect answer sheets", desc: "Collect physical answer sheets from students after a test or mock exam." },
              { step: "2", title: "Scan and upload", desc: "Photograph each sheet or scan to PDF. Upload to GetAhead AI one by one." },
              { step: "3", title: "Receive evaluations", desc: "Each evaluation completes in 30 seconds with marks, breakdown, and feedback." },
              { step: "4", title: "Share reports", desc: "Download PDFs to share with students and parents. Review marks and confirm." },
              { step: "5", title: "Analyse class performance", desc: "Use Analytics to see which topics the whole class struggled with most." },
              { step: "6", title: "Generate follow-up paper", desc: "Create a practice paper focused on weak topics using the Question Paper Generator." },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{item.step}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Consistency Point */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-poppins)" }}>
              AI grading is more consistent than human grading
            </h2>
            <div className="space-y-4">
              {[
                "No fatigue-related errors on sheet 30 vs. sheet 1",
                "Same rubric applied to every student, every time",
                "No unconscious bias based on student history or handwriting neatness",
                "Marks breakdown visible and auditable — not a black box",
                "You can always override the AI marks if you disagree",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-8 border border-teal-100">
            <Users className="w-12 h-12 text-teal-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>
              For classrooms of any size
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Whether you&apos;re evaluating 5 students or 50, GetAhead AI scales with your workload. Bulk upload (multiple sheets in one go) is on the roadmap for Q3 2026.
            </p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm">
              Start Evaluating Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-teal-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Give your students better feedback, faster
          </h2>
          <p className="text-teal-100 text-lg mb-8">
            Create a free teacher account and evaluate your first batch of sheets today.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-teal-600 font-bold px-8 py-4 rounded-xl hover:bg-teal-50 transition-colors shadow-lg group">
            Start Free Today <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
