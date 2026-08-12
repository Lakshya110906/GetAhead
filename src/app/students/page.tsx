import type { Metadata } from "next";
import Link from "next/link";
import {
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
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "For students",
  description: "GetAhead AI helps students get personalised AI feedback, track their performance, and prepare smarter for exams.",
  alternates: { canonical: "/students" },
  openGraph: {
    title: "For students — GetAhead AI",
    description: "Personalised AI feedback, performance tracking, and smarter exam preparation — built for every student.",
    url: "/students",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "For students — GetAhead AI",
    description: "Personalised AI feedback, performance tracking, and smarter exam preparation — built for every student.",
    images: ["/og-image.png"],
  },
};

export default function StudentsPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-paper">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <Star className="w-4 h-4" />
                Designed for every student
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                Study smarter.<br />
                <span className="text-ink">Score higher.</span>
              </h1>
              <p className="text-xl text-graphite leading-relaxed mb-8">
                GetAhead AI gives you personalised feedback on every answer sheet in under a minute — so you know exactly what to fix before your real exam.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-ink text-paper font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/how-it-works" className="inline-flex items-center justify-center gap-2 bg-surface text-ink font-medium px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                  How it works <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: "Evaluate in under a minute" },
                { icon: MessageSquare, label: "AI feedback per question" },
                { icon: TrendingUp, label: "Track your progress" },
                { icon: Target, label: "Know what to study next" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-surface rounded-2xl p-5 border border-rule shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-fixed-ink flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-ink">{item.label}</p>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Why students choose GetAhead AI
          </h2>
          <p className="text-graphite text-lg max-w-2xl mx-auto">
            Most students practise hard but don&apos;t know where they&apos;re losing marks. GetAhead AI tells you exactly that — question by question.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: MessageSquare,
              title: "Personalised AI feedback",
              description: "Every evaluation gives you question-by-question feedback — not just a score. The AI identifies conceptual gaps, careless mistakes, and areas where you lost easy marks.",
              color: "from-blue-500 to-blue-600",
              bg: "bg-blue-50",
            },
            {
              icon: TrendingUp,
              title: "Performance tracking",
              description: "See your score trends over time, subject-wise averages, and how you're improving month by month. Data-driven preparation, not guesswork.",
              color: "from-teal-500 to-teal-600",
              bg: "bg-teal-50",
            },
            {
              icon: BookOpen,
              title: "Better exam preparation",
              description: "Use the Question Paper Generator to practise with AI-generated papers at your chosen difficulty. Evaluate your answers. Repeat. Improve.",
              color: "from-purple-500 to-purple-600",
              bg: "bg-purple-50",
            },
            {
              icon: Clock,
              title: "Instant results",
              description: "No more waiting days for your teacher to return marked sheets. Get your evaluation in under a minute — so you can act on feedback immediately.",
              color: "from-orange-500 to-orange-600",
              bg: "bg-orange-50",
            },
            {
              icon: BarChart3,
              title: "Subject-wise analytics",
              description: "Understand which subjects are your strengths and which need more time. Analytics across all your evaluations reveal patterns you'd never notice manually.",
              color: "from-pink-500 to-pink-600",
              bg: "bg-pink-50",
            },
            {
              icon: Target,
              title: "Study recommendations",
              description: "After each evaluation, the AI gives specific topics to revise — not generic advice. If you lost marks on Newton's third law, it tells you to revise exactly that.",
              color: "from-indigo-500 to-indigo-600",
              bg: "bg-indigo-50",
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

      {/* Student Workflow */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12" style={{ fontFamily: "var(--font-display)" }}>
            A typical student workflow
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "Q1", title: "Take a practice test", desc: "Write answers for a mock exam or chapter test under timed conditions." },
              { step: "Q2", title: "Upload the sheet", desc: "Photograph or scan your answer sheet, and upload it to GetAhead." },
              { step: "Q3", title: "Review AI feedback", desc: "See your marks, read the feedback, and understand exactly where you lost marks." },
              { step: "Q4", title: "Revise and repeat", desc: "Focus your revision on the specific topics the AI flagged. Generate a new paper. Evaluate again." },
            ].map((item) => (
              <div key={item.step} className="bg-surface rounded-2xl border border-rule shadow-sm p-6 text-center">
                <div className="w-10 h-10 bg-fixed-ink rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">{item.step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-graphite leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-fixed-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Your next evaluation is under a minute away
          </h2>
          <p className="text-white/70 text-lg mb-8">Create a free account and upload your first answer sheet today. No card required.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-surface text-blue-600 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-lg group">
            Start free <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {["Free during beta", "No credit card", "Instant results", "Personalised feedback"].map((t) => (
              <span key={t} className="flex items-center gap-2 text-white/70 text-sm">
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
