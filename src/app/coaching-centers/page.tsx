import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Users,
  GraduationCap,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  Trophy,
  Layers,
  FileText,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "For coaching centers",
  description: "GetAhead AI helps coaching centers run AI-powered mock test evaluations, track student batch performance, and generate custom question papers for JEE, NEET, and board exams.",
  alternates: { canonical: "/coaching-centers" },
  openGraph: {
    title: "For coaching centers — GetAhead AI",
    description: "AI mock test evaluation, batch rankings, and custom question papers for coaching centers.",
    url: "/coaching-centers",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "For coaching centers — GetAhead AI",
    description: "AI mock test evaluation, batch rankings, and custom question papers for coaching centers.",
    images: ["/og-image.png"],
  },
};

export default function CoachingCentersPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-paper">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <Trophy className="w-4 h-4" />
                For JEE, NEET, and board prep centers
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                Mock tests evaluated.<br />
                <span className="text-ink">Results in minutes.</span>
              </h1>
              <p className="text-xl text-graphite leading-relaxed mb-8">
                GetAhead AI turns your coaching center&apos;s mock test grading from a multi-day bottleneck into a same-day, AI-powered workflow — consistent, fast, and insightful.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-ink text-paper font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg">
                  Start free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-surface text-ink font-medium px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                  Talk to us <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-surface rounded-2xl border border-orange-100 shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Coaching center impact</h3>
              <div className="space-y-5">
                {[
                  { label: "Mock test evaluation time", before: "2–3 days", after: "Much faster" },
                  { label: "Paper creation time", before: "3–4 hours", after: "Minutes" },
                  { label: "Feedback per student", before: "Generic / None", after: "AI-personalised" },
                  { label: "Grading consistency", before: "Varies by faculty", after: "Same rubric, every paper" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-graphite">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 line-through bg-gray-50 px-2 py-0.5 rounded">{row.before}</span>
                      <span className="text-orange-400">→</span>
                      <span className="text-sm font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{row.after}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features for Coaching */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Everything a coaching center needs
          </h2>
          <p className="text-graphite text-lg max-w-2xl mx-auto">
            From mock test evaluation to custom question papers — GetAhead AI handles your academic workflow.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Layers,
              title: "Batch management",
              description: "Organise evaluations by batch. Each faculty member evaluates their batch independently. Admin sees aggregate data. (Batch dashboard in development.)",
              color: "from-orange-500 to-orange-600",
            },
            {
              icon: Target,
              title: "Mock test evaluation",
              description: "Upload each student's mock test answer sheet. Get detailed marks, AI feedback, and strength/weakness analysis for every student — in under a minute each.",
              color: "from-red-500 to-red-600",
            },
            {
              icon: Trophy,
              title: "Student performance ranking",
              description: "Once each student is evaluated, compare scores manually or via analytics. Leaderboard and comparative ranking features are on the roadmap for Q3 2026.",
              color: "from-amber-500 to-amber-600",
            },
            {
              icon: GraduationCap,
              title: "AI question paper generation",
              description: "Create JEE/NEET-style question papers at Easy, Medium, or Hard difficulty. Set total marks, subject, and grade.",
              color: "from-blue-500 to-blue-600",
            },
            {
              icon: FileText,
              title: "Parent-ready reports",
              description: "Download professional PDF reports per student. Share with parents in parent-teacher meetings. Reports include marks breakdown, feedback, and study recommendations.",
              color: "from-purple-500 to-purple-600",
            },
            {
              icon: Users,
              title: "Faculty management",
              description: "Each faculty member logs in with their own account. No data overlap — teacher A cannot see teacher B's evaluations. Admin oversight via admin dashboard.",
              color: "from-teal-500 to-teal-600",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-surface rounded-2xl border border-rule shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className={"w-12 h-12 rounded-xl bg-fixed-ink flex items-center justify-center mb-4"}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-graphite leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 bg-orange-50/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12" style={{ fontFamily: "var(--font-display)" }}>
            Your mock test workflow with GetAhead AI
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { step: "Q1", title: "Conduct mock test", desc: "Students write answers on paper under exam conditions." },
              { step: "Q2", title: "Faculty scans sheets", desc: "Each faculty scans or photographs student answer sheets using their phone." },
              { step: "Q3", title: "Upload one by one", desc: "Upload each student's sheet to GetAhead. Select subject and exam type. Takes about a minute per student." },
              { step: "Q4", title: "AI evaluates in under a minute", desc: "Each sheet is evaluated in under a minute, with marks, breakdown, and personalised feedback." },
              { step: "Q5", title: "Download reports", desc: "Download PDF reports per student. Compile class performance data from analytics." },
              { step: "Q6", title: "Share with students and parents", desc: "Hand or email PDF reports. Students see exactly where they lost marks and what to improve." },
              { step: "Q7", title: "Generate follow-up paper", desc: "Use the question paper generator to create a targeted revision paper covering weak areas identified in the evaluation." },
            ].map((item) => (
              <div key={item.step} className="bg-surface rounded-2xl border border-orange-100 shadow-sm p-5 flex gap-4">
                <div className="w-10 h-10 bg-fixed-ink rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{item.step}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-graphite leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Subjects we evaluate
        </h2>
        <p className="text-center text-graphite mb-10 max-w-2xl mx-auto">
          GetAhead AI supports all core JEE, NEET, and board exam subjects.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            "Mathematics", "Physics", "Chemistry", "Biology",
            "English", "History", "Geography", "Economics",
            "Political Science", "Computer Science", "General Science", "Accountancy",
          ].map((sub) => (
            <div key={sub} className="bg-surface border border-rule rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm">
              <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
              <span className="text-sm font-medium text-ink">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Analytics preview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Track your centre&apos;s performance over time
              </h2>
              <div className="space-y-4">
                {[
                  { icon: TrendingUp, text: "Monthly performance trend charts per subject" },
                  { icon: BarChart3, text: "Average score per batch or subject" },
                  { icon: Clock, text: "Evaluation history with timestamps" },
                  { icon: FileText, text: "Saved report archive for each student" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-orange-500" />
                      </div>
                      <p className="text-ink text-sm mt-2">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-paper rounded-2xl border border-orange-100 p-8">
              <Trophy className="w-12 h-12 text-orange-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Competitive exam focus</h3>
              <p className="text-graphite mb-4 leading-relaxed text-sm">
                GetAhead AI is built for the rigorous standards of JEE, NEET, and board examinations. We&apos;re building a golden set of real, teacher-marked answer sheets so grading accuracy can be measured and published rather than just asserted — see the current status on our homepage.
              </p>
              <p className="text-graphite leading-relaxed text-sm">
                Students get feedback on every question, delivered in a fraction of the time a manually marked script would take.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-fixed-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Power your coaching center with AI evaluation
          </h2>
          <p className="text-orange-100 text-lg mb-8">
            Start free today. Custom institutional plans available on request.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-surface text-orange-600 font-bold px-8 py-4 rounded-xl hover:bg-orange-50 transition-colors shadow-lg group">
              Start free <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-colors border border-white/20">
              Contact us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
