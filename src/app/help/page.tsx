"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search,
  User,
  Lock,
  Upload,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Cpu,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Mail,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SupportResponseNote } from "@/components/SupportResponseNote";

const categories = [
  {
    id: "account",
    icon: User,
    label: "Account",
    color: "bg-blue-600",
    bg: "bg-blue-50",
    textColor: "text-blue-700",
    articles: [
      {
        title: "How to create a GetAhead AI account",
        content: `Creating an account is quick and free. From the homepage, click "Start free" in the top navigation. Fill in your full name, email address, and a strong password (minimum 8 characters). Select your role — Student, Teacher, or Institution — and click "Create account". You're signed in immediately and land straight on your dashboard — no separate verification step.`,
      },
      {
        title: "How to change your name or profile details",
        content: `Go to Settings from the dashboard sidebar. Under "Profile", you can update your display name. Click "Save Changes" when done. Email addresses cannot currently be changed — contact support via the Contact page if you need to update your email.`,
      },
      {
        title: "How to delete your account",
        content: `Account deletion is permanent and cannot be undone. To delete your account: go to Settings → Security → scroll to "Danger zone" → click "Delete account" → confirm by entering your password. All evaluations, reports, and question papers associated with your account will be permanently deleted within 7 days.`,
      },
      {
        title: "How to change your password",
        content: `To change your password: go to Settings → Security → Change Password. Enter your current password, then your new password (minimum 8 characters). Click "Update Password". You will not be signed out on the current device, but other active sessions may be invalidated.`,
      },
    ],
  },
  {
    id: "auth",
    icon: Lock,
    label: "Authentication",
    color: "bg-indigo-600",
    bg: "bg-indigo-50",
    textColor: "text-indigo-700",
    articles: [
      {
        title: "I forgot my password — how do I reset it?",
        content: `On the login page, click "Forgot Password?" below the password field. Enter your registered email address and click "Send Reset Link". Check your inbox for a password reset email. Click the link — it's valid for 1 hour. Enter and confirm your new password. You can then log in with the new credentials. All existing sessions will be logged out for security.`,
      },
      {
        title: "My password reset link isn't working",
        content: `Reset links expire after 1 hour. If the link expired, go to the login page and request a new one. If the link still doesn't work, try: copying and pasting the full URL from the email into your browser, clearing browser cache, or using a different browser. If problems persist, contact support via the Contact page.`,
      },
      {
        title: "I'm getting 'Invalid credentials' on login",
        content: `This means the email/password combination doesn't match our records. Double-check: your email is spelled correctly, Caps Lock is off, you're using the correct password. If you're unsure of your password, use "Forgot Password?" to reset it. If you receive "Too many attempts", wait 15 minutes before trying again — brute force protection has triggered.`,
      },
    ],
  },
  {
    id: "uploads",
    icon: Upload,
    label: "Uploads",
    color: "bg-teal-600",
    bg: "bg-teal-50",
    textColor: "text-teal-700",
    articles: [
      {
        title: "What file formats can I upload?",
        content: `GetAhead AI accepts PDF documents, JPEG images, and PNG images. For best results: use PDF for multi-page answer sheets, JPEG or PNG for single-page scans. Maximum file size is 20MB per upload. For files over 20MB, compress using a free tool like ilovepdf.com or smallpdf.com before uploading.`,
      },
      {
        title: "Tips for best OCR accuracy",
        content: `For typed answers: use a clean, high-resolution scan. For handwritten answers: ensure the photo is taken in good, even lighting; the paper should be flat with no shadows across text; use the highest resolution your phone allows; avoid motion blur. Handwriting should be legible — very rushed or cramped writing may reduce accuracy. Portrait orientation (vertical) works best.`,
      },
      {
        title: "My upload is failing — what should I do?",
        content: `Check: your internet connection is stable, the file is under 20MB, the file is a supported format (PDF, JPEG, PNG). Try converting to a different format. If the problem persists: refresh the page, try a different browser, clear browser cache. If still failing, contact support with the error message shown.`,
      },
      {
        title: "Can I upload multiple answer sheets at once?",
        content: `Currently, each upload evaluates one answer sheet at a time. Bulk upload (multiple sheets in one batch) is planned for a future release. Each sheet evaluation takes under a minute, so a class of 30 can be evaluated in well under an hour with individual uploads.`,
      },
    ],
  },
  {
    id: "reports",
    icon: FileText,
    label: "Reports",
    color: "bg-green-600",
    bg: "bg-green-50",
    textColor: "text-green-700",
    articles: [
      {
        title: "What does an evaluation report include?",
        content: `Every evaluation report includes: total marks awarded and percentage, a question-by-question marks breakdown with AI reasoning, overall AI feedback on the evaluation, identified strengths (topics you answered well), identified weaknesses (topics where marks were lost), specific study recommendations. Reports are available immediately after evaluation completes.`,
      },
      {
        title: "How do I download a report as PDF?",
        content: `Open the evaluation from your dashboard. On the evaluation detail page, click "Download Report" (document icon). A professionally formatted PDF is generated and downloaded to your device. The PDF includes your name, date, subject, all marks, AI feedback, and recommendations.`,
      },
      {
        title: "How do I save a report?",
        content: `On any evaluation page, click the "Save Report" button (bookmark icon). You can optionally give it a custom name like "Chemistry Mock — April 2026". Saved reports appear in the "Saved Reports" section of your dashboard sidebar for quick access anytime.`,
      },
      {
        title: "My evaluation shows incorrect marks — what do I do?",
        content: `AI evaluation is highly accurate but not infallible, especially for highly subjective topics or unusual answer styles. If you believe marks are incorrect: review the AI's reasoning in the marks breakdown, note the specific question and why you disagree. Currently, there's no in-app override — download the report and discuss with your teacher for high-stakes corrections. Manual override is on the roadmap.`,
      },
    ],
  },
  {
    id: "question-papers",
    icon: GraduationCap,
    label: "Question papers",
    color: "bg-purple-600",
    bg: "bg-purple-50",
    textColor: "text-purple-700",
    articles: [
      {
        title: "How do I generate a question paper?",
        content: `Go to "Generate Paper" in the dashboard sidebar. Fill in: Subject (e.g., Physics), Grade (e.g., Class 12), Difficulty (Easy / Medium / Hard), Total Marks (e.g., 70). Click "Generate". A complete, structured question paper is generated in minutes. You can regenerate up to your daily quota (currently 10 generations/day during beta).`,
      },
      {
        title: "How do I use the generated question paper?",
        content: `After generation: click "Copy to Clipboard" to copy the full paper text, then paste into Google Docs, Microsoft Word, or your school's system. Alternatively, save the paper to your account by clicking "Save Paper". Saved papers are accessible from your question papers list in the dashboard.`,
      },
      {
        title: "What subjects are supported for paper generation?",
        content: `All mainstream subjects are supported: Mathematics, Physics, Chemistry, Biology, English, History, Geography, Economics, Political Science, Computer Science, General Science, Accountancy, and more. Enter any subject name — the AI adapts to the subject's typical exam format and content.`,
      },
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    color: "bg-slate-600",
    bg: "bg-slate-50",
    textColor: "text-slate-700",
    articles: [
      {
        title: "Understanding your dashboard stats",
        content: `The dashboard shows four key stats: Total Evaluations (all uploads ever made), Average Score (average percentage across completed evaluations), Completed (evaluations fully processed by AI), Saved Reports (evaluations you've bookmarked). Below the stats, your recent evaluations list and performance charts are shown.`,
      },
      {
        title: "How to switch between dark and light mode",
        content: `In the sidebar, scroll to the bottom to find the Theme switcher. You can choose Light or Dark. Your preference is saved automatically and persists across sessions.`,
      },
      {
        title: "I can't see my evaluation in the dashboard",
        content: `Evaluations appear in the Recent Evaluations list after upload and processing. If an evaluation doesn't appear: wait 60 seconds and refresh, check that the upload completed without error, look in "All Evaluations" if you have many recent uploads. If the issue persists, contact support with your email address.`,
      },
    ],
  },
  {
    id: "ai",
    icon: Cpu,
    label: "AI evaluation",
    color: "bg-orange-600",
    bg: "bg-orange-50",
    textColor: "text-orange-700",
    articles: [
      {
        title: "How accurate is the AI evaluation?",
        content: `We're building a golden set of real, teacher-marked answer sheets so grading accuracy can be measured and published rather than asserted — see the current status on our homepage. In the meantime, accuracy is likely highest for well-structured written answers, factual content (science, history, geography), mathematical solutions with shown workings, and MCQ evaluation, and likely lower for highly interpretive essay questions, very niche topics, messy handwriting, and diagrams (described in text only). For high-stakes exams, we recommend a teacher review of results.`,
      },
      {
        title: "Does the AI support handwritten answers?",
        content: `Yes. Our OCR engine reads both printed and handwritten text. For best results: ensure good lighting, flat paper with no shadows, legible handwriting, clear pen/pencil contrast. Very faint pencil, overlapping text, or highly stylised handwriting may reduce accuracy. If OCR misreads a word, the evaluation score for that answer may be affected.`,
      },
      {
        title: "How does partial credit work?",
        content: `The AI is instructed to award partial credit when: the method or approach is correct even if the final answer is wrong, a definition is partially correct, a student demonstrates conceptual understanding despite factual errors, steps in a mathematical proof are correct up to a point. Partial marks are specified in the detailed breakdown so you can see exactly how each partial credit was awarded.`,
      },
    ],
  },
  {
    id: "troubleshooting",
    icon: AlertTriangle,
    label: "Troubleshooting",
    color: "bg-red-600",
    bg: "bg-red-50",
    textColor: "text-red-700",
    articles: [
      {
        title: "Evaluation stuck in 'Processing' state",
        content: `If your evaluation stays in 'Processing' for more than 2 minutes: refresh the page, check your internet connection, wait and try again. Processing requires an active connection to the Gemini AI API. Rarely, API outages can cause delays. If the evaluation doesn't complete within 5 minutes, start a new evaluation. Contact support if the problem repeats.`,
      },
      {
        title: "Page not loading or showing blank content",
        content: `Try: hard refresh (Cmd+Shift+R on Mac / Ctrl+Shift+R on Windows), clear browser cache and cookies, try a different browser, disable browser extensions temporarily. If using a VPN, try disabling it — some VPNs block cloud DB connections. If the problem persists, contact support via the Contact page with a screenshot and your browser/OS details.`,
      },
      {
        title: "How to report a bug",
        content: `We take bugs seriously. To report a bug: go to the Contact page and select "Bug Report". Describe what you were doing, what you expected to happen, and what actually happened. Include a screenshot if possible. We read every report and respond as quickly as we can.`,
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [activeCategory, setActiveCategory] = useState("account");
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const currentCat = categories.find((c) => c.id === activeCategory)!;

  const filteredArticles = searchQuery.trim()
    ? categories.flatMap((c) =>
        c.articles
          .filter(
            (a) =>
              a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((a) => ({ ...a, catLabel: c.label, catColor: c.textColor }))
      )
    : null;

  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <SiteHeader />

      {/* Hero + Search */}
      <section className="pt-32 pb-16 bg-fixed-ink">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            How can we help?
          </h1>
          <p className="text-white/70 text-lg mb-8">
            Search our knowledge base or browse by category below.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-0 shadow-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-base"
              aria-label="Search help articles"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {searchQuery.trim() ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {filteredArticles?.length} result{filteredArticles?.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
            </h2>
            <div className="space-y-3">
              {filteredArticles?.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-graphite">No articles found. <Link href="/contact" className="text-blue-600 hover:underline">Contact support</Link> for help.</p>
                </div>
              ) : (
                filteredArticles?.map((a) => (
                  <div key={a.title} className="bg-surface rounded-2xl border border-rule shadow-sm p-5">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-semibold ${a.catColor} bg-gray-50 px-2 py-1 rounded-md border border-rule whitespace-nowrap mt-0.5`}>{a.catLabel}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">{a.title}</h3>
                        <p className="text-sm text-graphite leading-relaxed">{a.content.slice(0, 200)}…</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Category grid on mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:hidden mb-4">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${activeCategory === cat.id ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 bg-surface text-graphite hover:border-blue-200"}`}
                  >
                    <Icon className="w-5 h-5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Sidebar for desktop */}
            <aside className="hidden lg:block lg:w-56 flex-shrink-0">
              <h2 className="text-xs font-semibold text-graphite uppercase tracking-wide mb-4">Browse by topic</h2>
              <nav className="space-y-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeCategory === cat.id ? "bg-blue-50 text-blue-700" : "text-graphite hover:bg-gray-50 hover:text-ink"}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {cat.label}
                      <span className="ml-auto text-xs text-gray-400">({cat.articles.length})</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Articles */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl ${currentCat.color} flex items-center justify-center`}>
                  <currentCat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>{currentCat.label}</h2>
                  <p className="text-sm text-graphite">{currentCat.articles.length} articles</p>
                </div>
              </div>
              <div className="space-y-3">
                {currentCat.articles.map((article, idx) => {
                  const key = `${activeCategory}-${idx}`;
                  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                  const isOpen = openArticle === key;
                  return (
                    <div key={key} className="bg-surface rounded-2xl border border-rule shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <button
                        id={`help-question-${slug}`}
                        onClick={() => setOpenArticle(isOpen ? null : key)}
                        className="w-full flex items-center justify-between p-5 text-left gap-4"
                        aria-expanded={isOpen}
                        aria-controls={`help-answer-${slug}`}
                      >
                        <span className="font-medium text-gray-900">{article.title}</span>
                        <ChevronDown aria-hidden="true" className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div
                          id={`help-answer-${slug}`}
                          role="region"
                          aria-labelledby={`help-question-${slug}`}
                          className="px-5 pb-5 border-t border-gray-50"
                        >
                          <p className="text-sm text-graphite leading-relaxed pt-4">{article.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Still need help */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Mail className="w-10 h-10 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Can&apos;t find your answer?
          </h2>
          <SupportResponseNote className="text-graphite mb-6" />
          <Link href="/contact" className="inline-flex items-center gap-2 bg-ink text-paper font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
            Contact support <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-graphite transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-graphite">Help center</span>
        </nav>
      </div>

      <SiteFooter />
    </div>
  );
}
