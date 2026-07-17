import type { Metadata } from "next";
import Link from "next/link";
import { Brain, ChevronRight, Shield } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — GetAhead AI",
  description: "Read the GetAhead AI Privacy Policy to understand what data we collect, how we use it, how we protect it, and your rights as a user.",
  openGraph: {
    title: "Privacy Policy — GetAhead AI",
    description: "Our privacy policy explains how we collect, use, and protect your data.",
    type: "website",
  },
};

const EFFECTIVE_DATE = "17 July 2026";
const CONTACT_EMAIL = "privacy@getahead.ai";

export default function PrivacyPage() {
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
      <section className="pt-32 pb-12 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Shield className="w-4 h-4" />
            Your privacy matters
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Privacy Policy
          </h1>
          <p className="text-gray-600 mb-3">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
          </p>
          <p className="text-gray-600 leading-relaxed">
            GetAhead AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This policy explains what personal data we collect, why we collect it, how we use it, and what rights you have over your data. Please read it carefully.
          </p>
        </div>
      </section>

      {/* TOC */}
      <section className="py-8 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Contents</h2>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              "1. Information We Collect",
              "2. Why We Collect It",
              "3. How We Use Your Data",
              "4. AI Processing",
              "5. Cookies",
              "6. Authentication & Sessions",
              "7. Data Sharing",
              "8. Data Retention",
              "9. Your Rights",
              "10. Data Security",
              "11. Children",
              "12. Changes to This Policy",
              "13. Contact Us",
            ].map((item) => (
              <a key={item} href={`#section-${item.split(".")[0].trim()}`} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                {item}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <article className="py-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="prose prose-gray max-w-none space-y-10">

          <section id="section-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>1. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">a) Account Information</h3>
            <p className="text-gray-700 leading-relaxed mb-4">When you create an account, we collect: your full name, email address, hashed password (we never store plain-text passwords), and your selected role (Student, Teacher, or Institution).</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">b) Evaluation Data</h3>
            <p className="text-gray-700 leading-relaxed mb-4">When you upload an answer sheet and run an evaluation, we store: the metadata of the upload (subject, grade, exam type, filename), the text extracted from your answer sheet by OCR, the marks and feedback generated by the AI, and the timestamps of the evaluation.</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">c) Question Papers</h3>
            <p className="text-gray-700 leading-relaxed mb-4">If you generate a question paper, we store: the parameters you selected (subject, grade, difficulty, total marks) and the generated paper content.</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">d) Usage Data</h3>
            <p className="text-gray-700 leading-relaxed mb-4">We collect technical usage data including: browser type, operating system, IP address (for security and rate limiting), and timestamps of key actions (login, upload, evaluation).</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">e) Audit Logs</h3>
            <p className="text-gray-700 leading-relaxed">For security and operational purposes, we maintain audit logs of significant actions (e.g., admin logins, account deletions). These logs include IP addresses and action timestamps.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>2. Why We Collect It</h2>
            <ul className="space-y-3 text-gray-700">
              {[
                { label: "Account data", reason: "To create and manage your account, authenticate you, and allow you to access your evaluations." },
                { label: "Evaluation data", reason: "To process your answer sheets, display your results, and power the Analytics dashboard." },
                { label: "Question paper data", reason: "To save generated papers to your account for future reference." },
                { label: "Usage data", reason: "To monitor platform performance, detect abuse, enforce rate limits, and debug technical issues." },
                { label: "Audit logs", reason: "To maintain security, investigate incidents, and comply with our internal governance standards." },
              ].map((item) => (
                <li key={item.label} className="flex gap-3">
                  <span className="font-semibold text-gray-900 min-w-[160px]">{item.label}:</span>
                  <span>{item.reason}</span>
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section id="section-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>3. How We Use Your Data</h2>
            <p className="text-gray-700 leading-relaxed mb-4">We use your data solely to provide and improve the GetAhead AI service. Specifically:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>To authenticate you and maintain your session</li>
              <li>To process uploaded answer sheets through OCR and AI evaluation</li>
              <li>To display evaluation results, marks breakdowns, and AI feedback in your dashboard</li>
              <li>To generate performance analytics from your evaluation history</li>
              <li>To generate question papers based on your parameters</li>
              <li>To send transactional emails (email verification, password reset)</li>
              <li>To detect and prevent abuse, fraud, and security threats</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">We do <strong>not</strong> use your data to serve advertisements, profile you for marketing, or sell your data to third parties.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>4. AI Processing</h2>
            <p className="text-gray-700 leading-relaxed mb-4">GetAhead AI uses the Google Gemini API to evaluate answer sheets and generate question papers. When you submit an evaluation:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>The OCR-extracted text from your answer sheet is sent to the Gemini API as part of a structured prompt.</li>
              <li>The response (marks and feedback) is received and stored in your account.</li>
              <li>We do not retain your answer sheet content in GetAhead AI&apos;s own databases beyond what is shown in your evaluation report.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">Please refer to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google&apos;s Privacy Policy</a> and the <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Gemini API Terms of Service</a> for details on how Google handles API request data. We do not use your data to train our own AI models.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>5. Cookies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">GetAhead AI uses the following cookies:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Cookie</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { name: "next-auth.session-token", purpose: "Authenticates your session. HttpOnly, Secure, SameSite=Lax.", duration: "30 days" },
                    { name: "next-auth.csrf-token", purpose: "Protects against CSRF attacks on authentication forms.", duration: "Session" },
                    { name: "exameval_admin_token", purpose: "Authenticates admin panel access. HttpOnly, Secure, SameSite=Strict.", duration: "2 hours" },
                  ].map((row) => (
                    <tr key={row.name} className="bg-white">
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">{row.name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.purpose}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">We do not use advertising cookies, third-party tracking cookies, or analytics cookies. All cookies are strictly necessary for the platform to function.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>6. Authentication &amp; Sessions</h2>
            <p className="text-gray-700 leading-relaxed mb-4">GetAhead AI uses NextAuth (Auth.js) with database-backed sessions. This means:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Your session is stored as a record in our secure database — not as a browser-decodable JWT.</li>
              <li>Sessions expire after 30 days of inactivity.</li>
              <li>Session tokens are stored in HTTP-only, Secure, SameSite=Lax cookies — inaccessible to JavaScript.</li>
              <li>When you sign out, your session record is deleted from the database immediately.</li>
              <li>Changing your password invalidates all other active sessions for your account.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section id="section-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>7. Data Sharing</h2>
            <p className="text-gray-700 leading-relaxed mb-4">We do not sell, rent, or trade your personal data. We share data only with the following trusted sub-processors, strictly as required to operate the service:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Aiven Cloud</strong> — MySQL database hosting (data encrypted at rest, SOC 2 compliant).</li>
              <li><strong>Google Gemini API</strong> — AI evaluation and question generation (answer text sent per-request).</li>
              <li><strong>Resend</strong> — Transactional email delivery (verification and password reset emails).</li>
              <li><strong>Vercel</strong> — Application hosting and deployment infrastructure.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">We may disclose data to law enforcement or regulatory authorities only when legally required to do so, and only to the minimum extent necessary.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>8. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed mb-4">We retain your data for as long as your account is active. Specifically:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Account data and evaluations are retained indefinitely while your account is active.</li>
              <li>When you delete your account, all associated data (evaluations, reports, question papers, sessions) is permanently deleted within 7 days.</li>
              <li>Audit logs are retained for 12 months for security and compliance purposes.</li>
              <li>Error logs are retained for 30 days and then automatically purged.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section id="section-9">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>9. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-4">You have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Access</strong> — Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction</strong> — Request correction of inaccurate personal data.</li>
              <li><strong>Deletion</strong> — Request permanent deletion of your account and all associated data.</li>
              <li><strong>Portability</strong> — Request your evaluation data in a machine-readable format.</li>
              <li><strong>Objection</strong> — Object to specific processing of your data.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">To exercise any of these rights, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>10. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">We implement the following security measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>All traffic encrypted via HTTPS/TLS (enforced in production)</li>
              <li>Passwords hashed with bcrypt (cost factor 12) — never stored in plaintext</li>
              <li>Database sessions instead of JWTs — sessions revocable server-side</li>
              <li>HTTP-only, Secure, SameSite cookies to prevent XSS and CSRF</li>
              <li>Rate limiting on all authentication endpoints</li>
              <li>Security headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy</li>
              <li>Input validation on all API endpoints using Zod</li>
              <li>Role-based access control — data is isolated per user account</li>
              <li>Regular dependency audits and security patches</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">Despite our best efforts, no system is perfectly secure. In the event of a data breach affecting your personal data, we will notify affected users within 72 hours via email.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-11">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>11. Children</h2>
            <p className="text-gray-700 leading-relaxed">GetAhead AI is not directed at children under the age of 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data without parental consent, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a> and we will delete it promptly. For students aged 13–17, parental or guardian consent may be required depending on your jurisdiction.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>12. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">We may update this Privacy Policy from time to time. When we make significant changes, we will update the &quot;Effective date&quot; at the top of this page and notify registered users via email at least 14 days before the changes take effect. Your continued use of GetAhead AI after the effective date constitutes acceptance of the updated policy.</p>
          </section>

          <hr className="border-gray-100" />

          <section id="section-13">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>13. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">For any privacy-related questions, requests, or concerns:</p>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 space-y-2">
              <p className="text-gray-700"><strong>GetAhead AI</strong></p>
              <p className="text-gray-700">Privacy enquiries: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a></p>
              <p className="text-gray-700">General support: <a href="mailto:support@getahead.ai" className="text-blue-600 hover:underline">support@getahead.ai</a></p>
              <p className="text-gray-700">Contact form: <Link href="/contact" className="text-blue-600 hover:underline">getahead.ai/contact</Link></p>
            </div>
          </section>

        </div>
      </article>

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-600">Privacy Policy</span>
        </nav>
      </div>

      <SiteFooter />
    </div>
  );
}
