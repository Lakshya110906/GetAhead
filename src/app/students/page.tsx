import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  TrendingUp,
  MessageSquare,
  BookOpen,
  Target,
  Clock,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  ChevronRight,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "For Students — GetAhead AI",
  description: "GetAhead AI helps students get personalised AI feedback, track their performance, and prepare smarter for exams. Upload your answer sheet and get marks in 30 seconds.",
  openGraph: {
    title: "For Students — GetAhead AI",
    description: "Personalised AI feedback, performance tracking, and smarter exam preparation — built for every student.",
    type: "website",
  },
};

export default function StudentsPage() {
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
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-teal-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <Star className="w-4 h-4" />
                Designed for every student
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
                Study smarter.<br />
                <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Score higher.</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                GetAhead AI gives you instant, personalised feedback on every answer sheet — so you know exactly what to fix before your real exam.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20">
                  Start for Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/how-it-works" className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-medium px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                  How It Works <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: "Evaluate in 30 seconds", color: "from-blue-500 to-blue-600" },
                { icon: MessageSquare, label: "AI feedback per question", color: "from-teal-500 to-teal-600" },
                { icon: TrendingUp, label: "Track your progress", color: "from-purple-500 to-purple-600" },
                { icon: Target, label: "Know what to study next", color: "from-orange-500 to-orange-600" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Why Students */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Why students choose GetAhead AI
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Most students practise hard but don&apos;t know where they&apos;re losing marks. GetAhead AI tells you exactly that — question by question.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: MessageSquare,
              title: "Personalised AI Feedback",
              description: "Every evaluation gives you question-by-question feedback — not just a score. The AI identifies conceptual gaps, careless mistakes, and areas where you lost easy marks.",
              color: "from-blue-500 to-blue-600",
              bg: "bg-blue-50",
            },
            {
              icon: TrendingUp,
              title: "Performance Tracking",
              description: "See your score trends over time, subject-wise averages, and how you're improving month by month. Data-driven preparation, not guesswork.",
              color: "from-teal-500 to-teal-600",
              bg: "bg-teal-50",
            },
            {
              icon: BookOpen,
              title: "Better Exam Preparation",
              description: "Use the Question Paper Generator to practise with AI-generated papers at your chosen difficulty. Evaluate your answers. Repeat. Improve.",
              color: "from-purple-500 to-purple-600",
              bg: "bg-purple-50",
            },
            {
              icon: Clock,
              title: "Instant Results",
              description: "No more waiting days for your teacher to return marked sheets. Get your evaluation in under 30 seconds — so you can act on feedback immediately.",
              color: "from-orange-500 to-orange-600",
              bg: "bg-orange-50",
            },
            {
              icon: BarChart3,
              title: "Subject-wise Analytics",
              description: "Understand which subjects are your strengths and which need more time. Analytics across all your evaluations reveal patterns you'd never notice manually.",
              color: "from-pink-500 to-pink-600",
              bg: "bg-pink-50",
            },
            {
              icon: Target,
              title: "Study Recommendations",
              description: "After each evaluation, the AI gives specific topics to revise — not generic advice. If you lost marks on Newton's third law, it tells you to revise exactly that.",
              color: "from-indigo-500 to-indigo-600",
              bg: "bg-indigo-50",
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

      {/* Student Workflow */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12" style={{ fontFamily: "var(--font-poppins)" }}>
            A typical student workflow
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Take a practice test", desc: "Write answers for a mock exam or chapter test under timed conditions." },
              { step: "2", title: "Upload the sheet", desc: "Photograph or scan your answer sheet. Upload to GetAhead AI in seconds." },
              { step: "3", title: "Review AI feedback", desc: "See your marks, read the feedback, and understand exactly where you lost marks." },
              { step: "4", title: "Revise and repeat", desc: "Focus your revision on the specific topics the AI flagged. Generate a new paper. Evaluate again." },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">{item.step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What students say */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12" style={{ fontFamily: "var(--font-poppins)" }}>
          Built for real exam pressure
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { subject: "Class 12 Mathematics", quote: "I used to get 68–72 in maths. After 3 months of evaluating my practice sheets with GetAhead AI, I understood my calculus errors and improved to 89." },
            { subject: "NEET Biology", quote: "The AI pointed out I kept confusing meiosis phases. I revised that chapter specifically and it didn't cost me marks in the actual test." },
            { subject: "Class 10 Science", quote: "Generating question papers at medium and hard difficulty and evaluating my answers helped me figure out my board exam strategy well before the date." },
          ].map((t, i) => (
            <div key={i} className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl border border-blue-100 p-6">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
              <p className="text-xs font-semibold text-blue-700">{t.subject}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-teal-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Your next evaluation is 30 seconds away
          </h2>
          <p className="text-blue-100 text-lg mb-8">Create a free account and upload your first answer sheet today. No card required.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-lg group">
            Start Free <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {["100% Free", "No credit card", "Instant results", "Personalised feedback"].map((t) => (
              <span key={t} className="flex items-center gap-2 text-blue-100 text-sm">
                <CheckCircle className="w-4 h-4 text-teal-300" />{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
