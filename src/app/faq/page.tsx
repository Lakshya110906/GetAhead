"use client";

import Link from "next/link";
import { useState } from "react";
import { Brain, ChevronDown, ArrowRight, HelpCircle } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

const faqCategories = [
  {
    label: "Accounts",
    faqs: [
      {
        q: "How do I create a GetAhead AI account?",
        a: "Go to getahead.ai and click 'Get Started Free'. Enter your name, email, and password, select your role (Student, Teacher, or Institution), and click Create Account. You'll receive a verification email within a few seconds.",
      },
      {
        q: "Is GetAhead AI free to use?",
        a: "Yes — GetAhead AI is currently completely free. There are no pricing tiers, no credit card required, and no hidden limits. We plan to introduce optional premium features in the future, but the core evaluation and question generation features will remain free.",
      },
      {
        q: "Can I change my role after signing up?",
        a: "You can update your profile from the Settings page. Role changes take effect immediately and adjust your dashboard experience accordingly.",
      },
      {
        q: "Can I have multiple accounts?",
        a: "You may create one account per email address. Teachers managing multiple classes should use the Institution role, which supports broader administrative use. Multiple personal accounts for the same person violate our Terms of Service.",
      },
      {
        q: "How do I delete my account?",
        a: "Account deletion is available from Settings → Account → Delete Account. Deleting your account permanently removes all your evaluations, reports, and generated papers. This action cannot be undone.",
      },
    ],
  },
  {
    label: "Login & Authentication",
    faqs: [
      {
        q: "I forgot my password. How do I reset it?",
        a: "On the login page, click 'Forgot Password?'. Enter your registered email address and we'll send a reset link within seconds. The link is valid for 1 hour. If you don't see the email, check your spam folder.",
      },
      {
        q: "Why do I need to verify my email?",
        a: "Email verification ensures the address belongs to you and protects your account from unauthorised access. It also allows us to reliably send you password reset emails if you ever get locked out.",
      },
      {
        q: "My verification link expired. What should I do?",
        a: "Go to the login page and click 'Resend Verification Email'. Enter your email and we'll send a fresh link. Verification links expire after 24 hours for security.",
      },
      {
        q: "Can I stay signed in across sessions?",
        a: "Yes. Sessions persist for 30 days by default. You'll stay logged in unless you explicitly sign out or your session expires. For shared devices, always use the Sign Out button.",
      },
      {
        q: "Why was I signed out unexpectedly?",
        a: "Sessions expire after 30 days of inactivity. If you changed your password, all existing sessions are invalidated for security. Admin-initiated account changes may also trigger sign-out.",
      },
    ],
  },
  {
    label: "Privacy & Data Security",
    faqs: [
      {
        q: "Is my exam data private?",
        a: "Yes. Your uploaded answer sheets and evaluation data are stored securely in your account and never shared with third parties. We do not use your exam content to train external AI models.",
      },
      {
        q: "Where is my data stored?",
        a: "Your data is stored in a MySQL database hosted on Aiven Cloud — a SOC 2 compliant cloud infrastructure provider. Data is encrypted at rest and in transit via HTTPS/TLS.",
      },
      {
        q: "Does GetAhead AI use my answers to train AI models?",
        a: "No. Your answer sheet content is sent to the Gemini API for a single evaluation request and is not retained by GetAhead AI for training purposes. Please see Google's Gemini API terms for their data handling policies.",
      },
      {
        q: "Can teachers see my evaluations without my permission?",
        a: "No. Every evaluation is private to your account. Sharing is only possible if you explicitly export and share the PDF report. We do not have a teacher-sees-all-students feature currently.",
      },
      {
        q: "How long is my data retained?",
        a: "Your data is retained for as long as your account is active. If you delete your account, all associated data (evaluations, reports, question papers) is permanently deleted within 7 days.",
      },
    ],
  },
  {
    label: "AI Evaluation",
    faqs: [
      {
        q: "How accurate is the AI evaluation?",
        a: "GetAhead AI uses Gemini 2.5 Flash, calibrated against standard academic rubrics for CBSE, ICSE, and general board formats. For well-structured written answers, accuracy is very high. For highly subjective or niche topics, we recommend a final teacher review for high-stakes exams.",
      },
      {
        q: "Does the AI understand partial credit?",
        a: "Yes. The AI is instructed to identify correct methodology with incorrect computation, partially correct definitions, and conceptual understanding demonstrated despite factual errors. It awards partial marks accordingly.",
      },
      {
        q: "Does it support handwritten answers?",
        a: "Yes. Our OCR engine supports handwriting recognition. For best results, ensure your scan is clear, well-lit, and the handwriting is legible. Very messy or faded handwriting may result in lower OCR accuracy.",
      },
      {
        q: "Which exam formats are supported?",
        a: "We support MCQ (Multiple Choice), Descriptive (written answers), and Mixed (combination of both). Select your format when uploading. Each format uses a different evaluation rubric.",
      },
      {
        q: "Can the AI evaluate diagrams or graphs?",
        a: "Diagrams drawn in answer sheets are described in text by OCR. The AI evaluates the descriptive content. Visual diagram grading (e.g., circuit diagrams, graphs) is on our roadmap for a future release.",
      },
      {
        q: "How long does an evaluation take?",
        a: "Most evaluations complete in 10–30 seconds. Longer answer sheets (20+ questions, dense text) may take up to 60 seconds. You can leave the page — the evaluation runs in the background and you'll see the result in your dashboard.",
      },
      {
        q: "What subjects does GetAhead AI support?",
        a: "GetAhead AI supports all mainstream academic subjects including Mathematics, Physics, Chemistry, Biology, History, Geography, Economics, English, Political Science, Computer Science, and more. The AI adapts its rubric to the selected subject.",
      },
    ],
  },
  {
    label: "File Uploads",
    faqs: [
      {
        q: "What file formats can I upload?",
        a: "You can upload PDF documents, JPEG images, and PNG images. For multi-page answer sheets, a single consolidated PDF is recommended. Maximum file size is 10MB per upload.",
      },
      {
        q: "Can I upload photos taken on my phone?",
        a: "Yes. A clear photo taken in good lighting works well. Ensure the paper is flat, the text is readable, and there are no heavy shadows across the writing. Portrait orientation works best.",
      },
      {
        q: "What if my upload fails?",
        a: "Check your internet connection and try again. If the file is over 10MB, compress it first using a free PDF compressor. If problems persist, try converting the file to a different supported format and contact support.",
      },
    ],
  },
  {
    label: "Reports & Analytics",
    faqs: [
      {
        q: "What does the evaluation report include?",
        a: "Each report includes: total marks and percentage, a question-by-question marks breakdown, AI overall feedback, identified strengths, identified weaknesses, and specific study recommendations tailored to your performance.",
      },
      {
        q: "Can I export my report as a PDF?",
        a: "Yes. From any completed evaluation, click 'Download Report'. A professionally formatted PDF including all evaluation details is generated and downloaded instantly.",
      },
      {
        q: "How does the Analytics page work?",
        a: "The Analytics page computes performance data across all your evaluations. It shows monthly score trends, subject-wise averages, total evaluations count, and average percentage — all updated automatically as you complete more evaluations.",
      },
      {
        q: "Can I save specific evaluations for quick reference?",
        a: "Yes. On any evaluation report page, click 'Save Report'. You can give it a custom name (e.g. 'Physics Mock 3 — May'). Saved reports appear in the Saved Reports section of your dashboard.",
      },
    ],
  },
  {
    label: "Question Paper Generator",
    faqs: [
      {
        q: "How do I generate a question paper?",
        a: "Go to Generate Paper in the sidebar. Select subject, grade (e.g., Class 12), difficulty (Easy, Medium, Hard), and total marks. Click Generate. A complete question paper is created in seconds.",
      },
      {
        q: "Can I customise the generated paper?",
        a: "Currently, you can customise subject, grade, difficulty, and total marks. Finer control over specific topics, question types, or syllabus coverage is on the roadmap.",
      },
      {
        q: "How do I use the generated paper?",
        a: "Click 'Copy to Clipboard' to copy the entire paper, then paste into Google Docs, Microsoft Word, or any exam system. You can also save the paper to your account for future reference.",
      },
      {
        q: "Are the generated questions original?",
        a: "Yes. The AI generates questions based on your specified parameters — it does not copy from a fixed bank. Each generation produces a unique paper. Questions follow standard exam style for your selected grade and subject.",
      },
    ],
  },
  {
    label: "Teachers & Institutions",
    faqs: [
      {
        q: "Can teachers use GetAhead AI for their entire class?",
        a: "Yes. Teachers can evaluate each student's answer sheet individually. Bulk upload (multiple sheets in one batch) is on the roadmap. For now, each evaluation takes 30–60 seconds per sheet.",
      },
      {
        q: "Is GetAhead AI suitable for schools and coaching centres?",
        a: "Absolutely. Schools and coaching centres can create an Institution account and use GetAhead AI to evaluate mock tests, generate practice papers, and track student performance. Institutional dashboard features are in development.",
      },
      {
        q: "Can I use GetAhead AI for competitive exam preparation (JEE, NEET, UPSC)?",
        a: "Yes. GetAhead AI supports Physics, Chemistry, Mathematics, and Biology — the core subjects for JEE and NEET. UPSC answer evaluation for GS papers is also supported. Select the subject and difficulty level accordingly.",
      },
      {
        q: "Does the platform support regional language answer sheets?",
        a: "Currently, the platform works best with English-medium answer sheets. Hindi and other regional language support is on our roadmap and planned for a future release.",
      },
    ],
  },
  {
    label: "Future Features",
    faqs: [
      {
        q: "What features are coming soon?",
        a: "Planned features include: bulk upload for teachers, Google Classroom integration, sharable student-teacher report links, parent portal, CBSE/ICSE rubric presets, WhatsApp report delivery, speech-to-text answer submission, and API access for institutions.",
      },
      {
        q: "How can I suggest a feature?",
        a: "Use the Contact page to submit a feature request. We actively read every submission and prioritise based on user demand. You can also reach us at support@getahead.ai.",
      },
      {
        q: "Will GetAhead AI always be free?",
        a: "The core features — AI evaluation and question paper generation — will remain free. We may introduce optional premium features (like bulk upload, advanced analytics, or API access) in future. Any changes will be communicated well in advance.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState("Accounts");

  const toggle = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentFaqs = faqCategories.find((c) => c.label === activeCategory);
  const totalFaqs = faqCategories.reduce((sum, cat) => sum + cat.faqs.length, 0);

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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <HelpCircle className="w-4 h-4" />
            {totalFaqs} questions answered
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
            Frequently Asked<br />
            <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Questions</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            Everything you need to know about GetAhead AI. Can&apos;t find your answer?{" "}
            <Link href="/contact" className="text-blue-600 font-medium hover:underline">Contact us</Link>.
          </p>
        </div>
      </section>

      {/* FAQ Layout */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Category sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Categories</h2>
            <nav className="space-y-1">
              {faqCategories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(cat.label)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === cat.label
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {cat.label}
                  <span className="ml-2 text-xs text-gray-400">({cat.faqs.length})</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* FAQ list */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-poppins)" }}>
              {activeCategory}
            </h2>
            <div className="space-y-3">
              {currentFaqs?.faqs.map((faq, idx) => {
                const key = `${activeCategory}-${idx}`;
                const isOpen = openItems[key];
                return (
                  <div key={key} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-start justify-between p-5 text-left gap-4"
                      aria-expanded={isOpen}
                    >
                      <span className="font-medium text-gray-900 text-base leading-snug">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-gray-50">
                        <p className="text-gray-600 text-sm leading-relaxed pt-4">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>
            Still have questions?
          </h2>
          <p className="text-gray-600 mb-6">
            Our support team responds within 24 hours on weekdays. You can also browse the Help Center for detailed guides.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
              Contact Support <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/help" className="inline-flex items-center gap-2 bg-white text-gray-700 font-medium px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
              Browse Help Center
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
