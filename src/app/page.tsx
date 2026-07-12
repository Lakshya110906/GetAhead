"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Brain,
  Upload,
  BarChart3,
  Clock,
  Shield,
  Award,
  Sparkles,
  GraduationCap,
  CheckCircle,
  Star,
  ArrowRight,
  Zap,
  Users,
  TrendingUp,
  BookOpen,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeSlider } from "@/components/ThemeSlider";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Evaluation",
    description:
      "Gemini 2.5 Flash analyzes answers with expert-level accuracy, providing detailed feedback in seconds.",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Upload,
    title: "Easy Upload",
    description:
      "Drag & drop PDFs or images. Our system extracts text and evaluates instantly.",
    color: "from-teal-500 to-teal-600",
    bg: "bg-teal-50",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description:
      "Visual breakdowns of subject-wise performance, trends over time, and improvement areas.",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Clock,
    title: "Save 90% Time",
    description:
      "Manual grading takes hours. ExamEval AI does it in under 30 seconds.",
    color: "from-orange-500 to-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: Shield,
    title: "Trusted & Accurate",
    description:
      "Calibrated against professional evaluators with 94%+ accuracy on standardized tests.",
    color: "from-green-500 to-green-600",
    bg: "bg-green-50",
  },
  {
    icon: Award,
    title: "Personalized Insights",
    description:
      "Custom study recommendations, strength/weakness analysis, and progress tracking.",
    color: "from-pink-500 to-pink-600",
    bg: "bg-pink-50",
  },
];

const steps = [
  {
    step: "01",
    title: "Upload Answer Sheet",
    desc: "Drag & drop your PDF or image. Supports handwritten and typed answers.",
    icon: Upload,
  },
  {
    step: "02",
    title: "AI Evaluates",
    desc: "Gemini 2.5 Flash reads, understands, and grades with expert-level precision.",
    icon: Brain,
  },
  {
    step: "03",
    title: "Get Detailed Report",
    desc: "Receive marks breakdown, strengths/weaknesses, and study recommendations.",
    icon: BarChart3,
  },
];



const faqs = [
  {
    question: "How accurate is the AI evaluation?",
    answer: "Our evaluation is powered by Gemini 2.5 Flash, calibrated with standardized academic rubrics. While highly accurate for spelling, math proofs, structure, and factual correctness, we recommend teachers do a final review for high-stakes examinations.",
  },
  {
    question: "What file formats are supported?",
    answer: "We support standard PDF documents, JPEG, and PNG images. For multi-page answer sheets, we recommend uploading a single consolidated PDF document for seamless grading.",
  },
  {
    question: "Is my exam paper data kept private?",
    answer: "Yes, your privacy is our top priority. All uploaded answer sheets and generated reports are stored securely in your dashboard and never shared with third parties or used to train open models.",
  },
  {
    question: "Does it evaluate handwritten answers?",
    answer: "Yes, our advanced OCR scanner supports handwriting recognition. As long as the handwritten text is legible and captured in clear lighting, the AI can read and grade it effectively.",
  },
];

const stats = [
  { value: "50,000+", label: "Evaluations Done", icon: CheckCircle },
  { value: "10,000+", label: "Students Trust Us", icon: Users },
  { value: "94%", label: "Accuracy Rate", icon: TrendingUp },
  { value: "30s", label: "Avg. Evaluation Time", icon: Zap },
];

export default function LandingPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const ctaUrl = isAuthenticated ? "/dashboard" : "/signup";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const toggleDarkMode = () => { setTheme(isDark ? "default" : "dark"); };
  void toggleDarkMode; // reserved for future navbar toggle

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-white"} transition-colors duration-300`}>
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDark ? "bg-gray-950/90 border-gray-800" : "bg-white/90 border-gray-100"}` }>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span
                className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Get<span className="text-gradient">Ahead</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className={`text-sm font-medium transition-colors ${isDark ? "text-gray-300 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"}`}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className={`text-sm font-medium transition-colors ${isDark ? "text-gray-300 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"}`}
              >
                How It Works
              </Link>

              <Link
                href="#faq"
                className={`text-sm font-medium transition-colors ${isDark ? "text-gray-300 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"}`}
              >
                FAQ
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              {/* Dark/Light Toggle Slider */}
              <ThemeSlider />
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="text-sm font-semibold text-white gradient-primary rounded-lg px-5 py-2 hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`text-sm font-medium transition-colors px-4 py-2 whitespace-nowrap ${isDark ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"}`}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm font-semibold text-white gradient-primary rounded-lg px-5 py-2 hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                  >
                    Start Free
                  </Link>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              <ThemeSlider />
              <button
                className={`p-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t px-4 py-4 space-y-3 ${isDark ? "border-gray-800 bg-gray-950" : "border-gray-100 bg-white"}`}>
            <Link
              href="#features"
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}
            >
              How It Works
            </Link>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="block text-white gradient-primary rounded-lg px-4 py-2 text-sm font-semibold text-center"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="block text-white gradient-primary rounded-lg px-4 py-2 text-sm font-semibold text-center"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className={`pt-24 pb-20 overflow-hidden transition-colors duration-300 ${isDark ? "bg-gray-950" : "gradient-hero"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-sm font-medium mb-6 ${isDark ? "bg-blue-950 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                <Sparkles className="w-4 h-4" />
                <span>Powered by Gemini 2.5 Flash</span>
              </div>

              <h1
                className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 ${isDark ? "text-white" : "text-gray-900"}`}
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <span className="text-gradient">AI-Powered</span>
                <br />
                Exam Answer
                <br />
                Evaluation
              </h1>

              <p className={`text-lg mb-8 max-w-lg leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Upload your answer sheets and get <strong>instant, accurate evaluation</strong> with
                detailed feedback, marks breakdown, and personalized study recommendations.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center gap-2 gradient-primary text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25 group"
                >
                  Start Free Evaluation
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href={isAuthenticated ? "/dashboard" : "/login"}
                  className={`inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl border transition-colors shadow-sm ${isDark ? "bg-gray-800 text-gray-200 border-gray-700 hover:border-blue-500 hover:text-blue-400" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600"}`}
                >
                  <BookOpen className="w-4 h-4" />
                  View Demo
                </Link>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex -space-x-2">
                  {["PS", "RK", "AG", "MT"].map((initials, i) => (
                    <div
                      key={i}
                      className={`w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white ${
                        ["bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-orange-500"][i]
                      }`}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-yellow-400 fill-yellow-400"
                      />
                    ))}
                  </div>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    <strong className={isDark ? "text-white" : "text-gray-900"}>10,000+ students</strong> trust GetAhead
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              {/* Dashboard Preview */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-white/30" />
                    <div className="w-3 h-3 rounded-full bg-white/30" />
                    <div className="w-3 h-3 rounded-full bg-white/30" />
                    <span className="ml-2 text-sm font-medium opacity-90">Evaluation Complete ✓</span>
                  </div>
                  <div className="flex items-end gap-4">
                    <div>
                      <p className="text-sm opacity-75">Mathematics — Grade 12</p>
                      <p className="text-4xl font-bold">82.5%</p>
                    </div>
                    <div className="text-right ml-auto">
                      <p className="text-sm opacity-75">Grade</p>
                      <p className="text-2xl font-bold">A</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { topic: "Algebra", score: 85, color: "bg-blue-500" },
                    { topic: "Calculus", score: 78, color: "bg-teal-500" },
                    { topic: "Statistics", score: 90, color: "bg-green-500" },
                    { topic: "Geometry", score: 72, color: "bg-orange-500" },
                  ].map((item) => (
                    <div key={item.topic} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-20">{item.topic}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-10 text-right">
                        {item.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 border border-gray-100 animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-gray-700">AI Evaluating...</span>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 border border-gray-100 animate-float" style={{ animationDelay: "1s" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span className="text-xs font-semibold text-gray-700">Report Ready!</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                <p
                  className="text-3xl font-bold text-white mb-1"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {stat.value}
                </p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Features</span>
            <h2
              className={`text-3xl md:text-4xl font-bold mt-2 mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Everything You Need to Excel
            </h2>
            <p className={`max-w-2xl mx-auto text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              From instant evaluation to long-term performance tracking — GetAhead has all the tools
              students, teachers, and institutions need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 card-shadow-md hover:card-shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <div
                    className={`w-6 h-6 bg-gradient-to-r ${feature.color} rounded-md flex items-center justify-center`}
                  >
                    <feature.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <h3
                  className="text-lg font-bold text-gray-900 mb-2"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-teal-600 font-semibold text-sm uppercase tracking-wider">Process</span>
            <h2
              className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Get Results in 3 Simple Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-200 to-teal-200" />

            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="w-24 h-24 rounded-2xl gradient-primary mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <div className="absolute top-0 right-0 -translate-y-2 translate-x-2 bg-gray-900 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                  {step.step}
                </div>
                <h3
                  className="text-xl font-bold text-gray-900 mb-3"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Banner — Free for Everyone */}
      <section id="free-tier" className="py-20 bg-gradient-to-r from-blue-900 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
            <Sparkles className="w-8 h-8 text-blue-300 animate-pulse" />
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            100% Free For Everyone
          </h2>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Get unlimited answer sheet evaluations, academic grading reports, and agentic question paper generation. No billing, subscription plans, or credit constraints.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href={ctaUrl}
              className="px-8 py-3.5 bg-white text-blue-900 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors text-base"
            >
              Get Started Now
            </Link>
            <span className="text-blue-200 text-sm font-semibold sm:border-l sm:border-blue-700/50 sm:pl-4">
              ExamEval AI is completely free to use.
            </span>
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
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Frequently Asked Questions
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
                className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left font-medium text-gray-900 hover:text-blue-600 transition-colors focus:outline-none"
                >
                  <span className="text-base sm:text-lg">{faq.question}</span>
                  <span className="flex-shrink-0 ml-4 text-gray-400">
                    {openFaqIndex === i ? (
                      <span className="text-2xl font-bold leading-none">-</span>
                    ) : (
                      <span className="text-2xl font-bold leading-none">+</span>
                    )}
                  </span>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    openFaqIndex === i ? "max-h-40 border-t border-gray-50" : "max-h-0"
                  }`}
                >
                  <p className="p-5 text-gray-600 text-sm leading-relaxed bg-gray-50/50">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GraduationCap className="w-16 h-16 text-white/80 mx-auto mb-6" />
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Ready to Transform Your Exam Performance?
            </h2>
            <p className="text-blue-100 text-lg mb-8">
              Join 10,000+ students and educators who trust GetAhead.
              Start with 10 free evaluations — no credit card needed.
            </p>
            <Link
              href={ctaUrl}
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-lg group"
            >
              Start Free Today
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">Get<span className="text-gradient">Ahead</span></span>
              </div>
              <p className="text-sm leading-relaxed">
                AI-powered exam evaluation for students, teachers, and institutions.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "How It Works", "FAQ"],
              },
              {
                title: "For Users",
                links: ["Students", "Teachers", "Institutions", "Coaching Centers"],
              },
              {
                title: "Support",
                links: ["Help Center", "Contact Us", "Privacy Policy", "Terms of Service"],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2024 GetAhead. All rights reserved. Built with ❤️ for Indian students.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
