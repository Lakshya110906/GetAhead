"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Brain,
  CheckCircle,
  BarChart3,
  GraduationCap,
  ArrowRight,
  Zap,
  Users,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Target,
  ClipboardCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MarkedAnswerSheet } from "@/components/MarkedAnswerSheet";
import { AudienceSwitcher } from "@/components/AudienceSwitcher";
import { ScreenshotSlot } from "@/components/ScreenshotSlot";
import type { AccuracySummary } from "@/lib/accuracyBaseline";

const productMoments = [
  {
    icon: CheckCircle,
    eyebrow: "Evaluation report",
    title: "See exactly where marks were lost",
    description:
      "Every uploaded sheet comes back as a question-by-question breakdown — marks awarded, marks lost, and the reasoning behind each one, not just a single score at the top.",
    screenshotCaption: "the evaluation report for a completed answer sheet",
    screenshotSrc: "/screenshots/evaluation-report.png",
    reverse: false,
  },
  {
    icon: BarChart3,
    eyebrow: "Analytics dashboard",
    title: "Deep analytics across every attempt",
    description:
      "Subject-wise averages, score trends over time, and the topics that are actually costing marks — visualized across every evaluation on the account, not just the last one.",
    screenshotCaption: "the analytics dashboard showing performance trends",
    screenshotSrc: "/screenshots/analytics-dashboard.png",
    reverse: true,
  },
  {
    icon: GraduationCap,
    eyebrow: "Question paper generator",
    title: "Generate a fresh paper in minutes",
    description:
      "Pick a subject, grade, topic, and difficulty, and GetAhead assembles a new paper with a full mark scheme — ready to print or assign, with no two papers alike.",
    screenshotCaption: "the question paper generator output",
    screenshotSrc: "/screenshots/question-paper-generator.png",
    reverse: false,
  },
];

const steps = [
  {
    step: "Q1",
    title: "Upload answer sheet",
    desc: "Drag and drop your PDF or image. Supports handwritten and typed answers.",
    icon: Zap,
  },
  {
    step: "Q2",
    title: "AI evaluates",
    desc: "The AI reads each answer against the mark scheme and grades question by question, with its reasoning shown alongside every mark.",
    icon: Brain,
  },
  {
    step: "Q3",
    title: "Get detailed report",
    desc: "Receive a marks breakdown, strengths and weaknesses, and study recommendations.",
    icon: BarChart3,
  },
];

const faqs = [
  {
    question: "How accurate is the AI evaluation?",
    answer: "We're building a golden set of real answer sheets marked by real teachers so we can measure this directly and re-check it on every prompt or rubric change, rather than just claim it — see the current status in the accuracy section below. Until that figure is published, treat the AI's marks as a strong first pass and have a teacher review anything high-stakes.",
  },
  {
    question: "What file formats are supported?",
    answer: "We support standard PDF documents, JPEG, and PNG images. For multi-page answer sheets, we recommend uploading a single consolidated PDF document for seamless grading.",
  },
  {
    question: "Is my exam paper data kept private?",
    answer: "Your uploaded answer sheets and generated reports are stored securely in your dashboard. The extracted text from your answer sheet is sent to the Google Gemini API to generate your evaluation.",
  },
  {
    question: "Does it evaluate handwritten answers?",
    answer: "Yes, our advanced OCR scanner supports handwriting recognition. As long as the handwritten text is legible and captured in clear lighting, the AI can read and grade it effectively.",
  },
];


export default function HomeClient({ accuracy }: { accuracy: AccuracySummary | null }) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const ctaUrl = isAuthenticated ? "/dashboard" : "/signup";

  const [dbStats, setDbStats] = useState<{
    totalUsers: number;
    totalEvaluations: number;
    averageTimeSeconds: number | null;
    averagePercentage: number | null;
  }>({
    totalUsers: 0,
    totalEvaluations: 0,
    averageTimeSeconds: null,
    averagePercentage: null,
  });

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/public/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.totalUsers !== undefined) {
          setDbStats(data);
        }
      })
      .catch(() => {});
  }, []);

  const statsList = [
    dbStats.totalEvaluations >= 100
      ? { value: dbStats.totalEvaluations.toString(), label: "Evaluations done", icon: CheckCircle }
      : null,
    dbStats.totalUsers >= 100
      ? { value: dbStats.totalUsers.toString(), label: "Registered users", icon: Users }
      : null,
    dbStats.totalEvaluations >= 100 && dbStats.averagePercentage !== null
      ? { value: `${dbStats.averagePercentage}%`, label: "Avg. evaluation score", icon: TrendingUp }
      : null,
    dbStats.averageTimeSeconds !== null
      ? { value: `${dbStats.averageTimeSeconds}s`, label: "Avg. evaluation time", icon: Zap }
      : null,
  ].filter((stat): stat is { value: string; label: string; icon: typeof CheckCircle } => stat !== null);

  return (
    <div className="min-h-screen bg-paper transition-colors duration-300">
      {/* Navbar */}
      <SiteHeader />

      <main>
      {/* Hero */}
      <section className={`pt-24 pb-20 overflow-hidden transition-colors duration-300 bg-paper`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1
                className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-ink`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                Upload an answer sheet and see exactly where every mark was won or lost.
              </h1>

              <p className={`text-lg mb-8 max-w-lg leading-relaxed text-graphite`}>
                Handwritten or typed, one sheet or many — get a full marks breakdown, question-by-question feedback, and what to study next, in seconds.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center gap-2 bg-ink text-paper font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25 group"
                >
                  Start free evaluation
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {dbStats.totalUsers >= 100 && (
                <div className="flex items-center gap-6">
                  <div>
                    <p className={`text-sm text-graphite`}>
                      Join <strong className={"text-ink"}>{dbStats.totalUsers}</strong> registered users on GetAhead
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative mt-12 lg:mt-0">
              <MarkedAnswerSheet />
            </div>
          </div>
        </div>
      </section>

      {/* Audience switcher */}
      <AudienceSwitcher />

      {/* Stats Bar */}
      {statsList.length > 0 && (
        <section className="py-12 bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {statsList.map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                  <p
                    className="text-3xl font-bold text-white mb-1"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-300">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features — real product moments */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">What it looks like</span>
            <h2
              className={`text-3xl md:text-4xl font-bold mt-2 mb-4 text-ink`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              Three things GetAhead actually does
            </h2>
            <p className={`max-w-2xl mx-auto text-lg text-graphite`}>
              Not a mockup — this is the running product.
            </p>
          </div>

          <div className="space-y-20">
            {productMoments.map((moment, i) => (
              <motion.div
                key={moment.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={`grid md:grid-cols-2 gap-10 items-center ${moment.reverse ? "" : ""}`}
              >
                <div className={moment.reverse ? "md:order-2" : ""}>
                  <div className="w-10 h-10 rounded-lg bg-fixed-ink flex items-center justify-center mb-4">
                    <moment.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-blue-600 font-semibold text-xs uppercase tracking-wider">
                    {moment.eyebrow}
                  </span>
                  <h3
                    className="text-2xl font-bold text-gray-900 mt-2 mb-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {moment.title}
                  </h3>
                  <p className="text-graphite leading-relaxed">{moment.description}</p>
                </div>
                <div className={moment.reverse ? "md:order-1" : ""}>
                  <ScreenshotSlot src={moment.screenshotSrc} alt={moment.title} caption={moment.screenshotCaption} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Accuracy — a real, measured figure, not a testimonial */}
      <section id="accuracy" className="py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-teal-600 font-semibold text-sm uppercase tracking-wider">Accuracy</span>
            <h2
              className="text-3xl md:text-4xl font-bold mt-2 mb-4 text-gray-900"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How close is the AI to a real teacher?
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-graphite">
              We measure it, we don&apos;t just claim it — against a golden set of real, teacher-marked answer sheets, re-run on every change to the grading prompt or rubric.
            </p>
          </div>

          {accuracy ? (
            <>
              <p className="text-center text-sm font-semibold text-graphite mb-6">
                n = {accuracy.scoredCases} real, photographed answer sheets ({accuracy.comparableQuestions} questions) — every figure below is a range over that sample, not a point estimate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10">
                <div className="text-center rounded-2xl p-6 border border-rule bg-gray-50">
                  <Target className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                  <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {accuracy.mae}
                  </p>
                  <p className="text-sm mt-1 text-graphite">
                    mean absolute error (marks/question)
                  </p>
                </div>
                <div className="text-center rounded-2xl p-6 border border-rule bg-gray-50">
                  <CheckCircle className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                  <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {accuracy.within1Pct}%
                  </p>
                  <p className="text-sm mt-1 text-graphite">
                    within 1 mark of the teacher
                  </p>
                </div>
                <div className="text-center rounded-2xl p-6 border border-rule bg-gray-50">
                  <ClipboardCheck className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                  <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {accuracy.within2Pct}%
                  </p>
                  <p className="text-sm mt-1 text-graphite">
                    within 2 marks of the teacher
                  </p>
                </div>
                <div className="text-center rounded-2xl p-6 border border-rule bg-gray-50">
                  <CheckCircle className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                  <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {accuracy.fullMarksAgreementPct}%
                  </p>
                  <p className="text-sm mt-1 text-graphite">
                    full-marks agreement (n={accuracy.fullMarksQuestionCount})
                  </p>
                </div>
              </div>
              <p className="text-center text-sm max-w-2xl mx-auto text-graphite">
                Methodology: {accuracy.scoredCases} real, phone-photographed answer sheets, marked per question by a
                real teacher without seeing the AI&apos;s output, spanning multiple subjects, grade levels, and
                handwriting quality — including deliberately hard cases (messy handwriting, partial credit, blank
                answers). Full breakdown by subject and handwriting quality, over- vs under-marking rate, and
                feedback specificity is in the methodology report. Last measured{" "}
                {new Date(accuracy.generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
              </p>
            </>
          ) : (
            <div className="text-center rounded-2xl p-8 border max-w-2xl mx-auto border-rule bg-gray-50 text-graphite">
              <ClipboardCheck className="w-6 h-6 text-teal-500 mx-auto mb-3" />
              <p className="text-sm">
                We&apos;re building this golden set right now — a set of real answer sheets marked by real teachers
                that we run our grading pipeline against on every prompt or rubric change. We&apos;ll publish the
                accuracy figure here as soon as it exists, with the full methodology behind it.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-teal-600 font-semibold text-sm uppercase tracking-wider">Process</span>
            <h2
              className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Get results in 3 simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5" style={{ background: "var(--rule)" }} />

            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="w-24 h-24 rounded-2xl bg-fixed-ink mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <div
                  className="absolute top-0 right-0 -translate-y-2 translate-x-2 bg-ink text-paper text-xs font-bold w-9 h-7 rounded-full flex items-center justify-center"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {step.step}
                </div>
                <h3
                  className="text-xl font-bold text-gray-900 mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-graphite leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">FAQ</span>
            <h2
              className="text-3xl md:text-4xl font-bold text-gray-900 mt-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-surface rounded-xl border border-rule overflow-hidden shadow-sm"
              >
                <button
                  id={`faq-question-${i}`}
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  aria-expanded={openFaqIndex === i}
                  aria-controls={`faq-answer-${i}`}
                  className="w-full flex items-center justify-between p-5 text-left font-medium text-gray-900 hover:text-blue-600 transition-colors"
                >
                  <span className="text-base sm:text-lg">{faq.question}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-5 h-5 flex-shrink-0 ml-4 text-gray-400 transition-transform ${
                      openFaqIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    openFaqIndex === i ? "max-h-40 border-t border-gray-50" : "max-h-0"
                  }`}
                >
                  <p className="p-5 text-graphite text-sm leading-relaxed bg-gray-50/50">
                    {faq.answer}
                    {faq.question === "Is my exam paper data kept private?" && (
                      <>
                        {" "}
                        Read our{" "}
                        <Link href="/privacy" className="text-blue-600 hover:underline">
                          privacy policy
                        </Link>
                        .
                      </>
                    )}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-fixed-ink">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GraduationCap className="w-16 h-16 text-white/80 mx-auto mb-6" />
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Upload your next answer sheet and find out where the marks went
            </h2>
            <p className="text-white/70 text-lg mb-8">
              Evaluate an answer sheet or generate a practice paper — free during beta, with a generous daily quota.
            </p>
            <Link
              href={ctaUrl}
              className="inline-flex items-center gap-2 bg-surface text-blue-600 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-lg group"
            >
              Start free
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>
      </main>

      <SiteFooter />
    </div>
  );
}
