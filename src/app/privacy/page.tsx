import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalEntityBlock } from "@/components/LegalEntityBlock";
import { LEGAL } from "@/lib/legalConfig";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Read the GetAhead AI Privacy Policy to understand what data we collect, how we use it, how we protect it, and your rights as a user.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy policy — GetAhead AI",
    description: "Our privacy policy explains how we collect, use, and protect your data.",
    url: "/privacy",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy policy — GetAhead AI",
    description: "Our privacy policy explains how we collect, use, and protect your data.",
    images: ["/og-image.png"],
  },
};

const EFFECTIVE_DATE = LEGAL.effectiveDate;

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>

      {/* Hero */}
      <section className="pt-32 pb-12 bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Shield className="w-4 h-4" />
            Your privacy matters
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Privacy policy
          </h1>
          <p className="text-graphite mb-3">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
          </p>
          <p className="text-graphite leading-relaxed">
            GetAhead AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is the data fiduciary for the personal data described here. This policy is the notice required by India&apos;s Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;) and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011: it explains what personal data we collect, why, on what basis, who it is shared with, how long we keep it, and how to exercise your rights or withdraw consent. Please read it carefully — you agree to it by ticking the consent box when you create an account.
          </p>
        </div>
      </section>

      {/* TOC */}
      <section className="py-8 border-b border-rule">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold text-graphite uppercase tracking-wide mb-4">Contents</h2>
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
              "11. Children and Students Under 18",
              "12. Legal Basis and Withdrawing Consent",
              "13. Users Outside India",
              "14. Grievance Redressal",
              "15. Changes to This Policy",
              "16. Contact Us",
            ].map((item) => (
              <a key={item} href={`#section-${item.split(".")[0].trim()}`} className="flex items-center gap-1.5 text-graphite hover:text-blue-600 transition-colors">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>1. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">a) Account Information</h3>
            <p className="text-ink leading-relaxed mb-4">When you create an account, we collect: your full name, email address, hashed password (we never store plain-text passwords), your selected role (Student, Teacher, or Institution), and a record of the date and policy version you consented to. We do not ask for your date of birth, phone number, school, or address — nothing beyond what is needed to run the service.</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">b) Evaluation Data</h3>
            <p className="text-ink leading-relaxed mb-4">When you upload an answer sheet and run an evaluation, we store: the uploaded file itself (in our file storage provider, see section 7), the metadata of the upload (subject, grade, exam type, filename), the text extracted from your answer sheet by the AI, the marks and feedback it generated, and the timestamps of the evaluation. If you upload a sheet written by someone else (for example, a teacher uploading a student&apos;s work), you are responsible for having that person&apos;s — or their parent&apos;s — permission to do so; see section 11.</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">c) Question Papers</h3>
            <p className="text-ink leading-relaxed mb-4">If you generate a question paper, we store: the parameters you selected (subject, grade, difficulty, total marks) and the generated paper content.</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">d) Usage Data</h3>
            <p className="text-ink leading-relaxed mb-4">We collect technical usage data including: browser type, operating system, IP address (for security and rate limiting), and timestamps of key actions (login, upload, evaluation).</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">e) Audit Logs</h3>
            <p className="text-ink leading-relaxed">For security and operational purposes, we maintain audit logs of significant actions (e.g., admin logins, account deletions). These logs include IP addresses and action timestamps.</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">f) Support Requests</h3>
            <p className="text-ink leading-relaxed">If you contact us through the contact form, we store the name, email address, and message you provide, together with your IP address and browser type (used only to detect abuse of the form), so that we can reply and keep a record of the conversation.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>2. Why We Collect It</h2>
            <ul className="space-y-3 text-ink">
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

          <hr className="border-rule" />

          <section id="section-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>3. How We Use Your Data</h2>
            <p className="text-ink leading-relaxed mb-4">We use your data solely to provide and improve the GetAhead AI service. Specifically:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>To authenticate you and maintain your session</li>
              <li>To process uploaded answer sheets through OCR and AI evaluation</li>
              <li>To display evaluation results, marks breakdowns, and AI feedback in your dashboard</li>
              <li>To generate performance analytics from your evaluation history</li>
              <li>To generate question papers based on your parameters</li>
              <li>To send transactional emails (password reset, support ticket notifications)</li>
              <li>To detect and prevent abuse, fraud, and security threats</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">We do <strong>not</strong> use your data to serve advertisements, profile you for marketing, or sell your data to third parties.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>4. AI Processing</h2>
            <p className="text-ink leading-relaxed mb-4">GetAhead AI uses the Google Gemini API to evaluate answer sheets and generate question papers. When you submit an evaluation:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Your uploaded file (PDF or image) is sent to the Gemini API so the model can read it, and the text it extracts is then sent back to the Gemini API as part of a structured grading prompt.</li>
              <li><strong>Important — how Google may use what you upload.</strong> GetAhead AI currently uses the Gemini API&apos;s <em>free (&quot;Unpaid&quot;) tier</em>. Google&apos;s terms for that tier state that Google &quot;uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services and machine learning technologies&quot;, that &quot;human reviewers may read, annotate, and process your API input and output&quot; (after it is disconnected from our account), and that you should &quot;not submit sensitive, confidential, or personal information to the Unpaid Services&quot;. In plain terms: an answer sheet you upload may be used by Google to improve its models and may be seen by Google&apos;s reviewers. We are working to move to Google&apos;s paid tier, under which Google states it does not use prompts or files to improve its products; this policy will be updated when that happens. Until then, <strong>please avoid uploading sheets that show a student&apos;s full name, roll number, school, or other identifying details</strong> — cover or crop them first.</li>
              <li>The response (marks and feedback) is received and stored in your account.</li>
              <li>We retain the extracted text from your answer sheet in GetAhead AI&apos;s own database, alongside the marks and feedback, so your evaluation report remains available in your dashboard. We do not train any model of our own on your data.</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">Please refer to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google&apos;s Privacy Policy</a> and the <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Gemini API Terms of Service</a> for the full text of the terms quoted above.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>5. Cookies</h2>
            <p className="text-ink leading-relaxed mb-4">GetAhead AI uses the following cookies:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-rule rounded-xl overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-ink">Cookie</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink">Purpose</th>
                    <th className="text-left px-4 py-3 font-semibold text-ink">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {[
                    { name: "__Secure-next-auth.session-token", purpose: "Authenticates your session, including admin access where applicable. HttpOnly, Secure, SameSite=Lax. (Named next-auth.session-token without the prefix in local development.)", duration: "15 minutes, refreshed while active" },
                    { name: "__Host-next-auth.csrf-token", purpose: "Protects against CSRF attacks on authentication forms.", duration: "Session" },
                    { name: "__Secure-next-auth.callback-url", purpose: "Remembers which page to return you to after signing in.", duration: "Session" },
                  ].map((row) => (
                    <tr key={row.name} className="bg-surface">
                      <td className="px-4 py-3 font-mono text-xs text-ink">{row.name}</td>
                      <td className="px-4 py-3 text-graphite">{row.purpose}</td>
                      <td className="px-4 py-3 text-graphite whitespace-nowrap">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-ink leading-relaxed mt-4">We do not use advertising cookies, third-party tracking cookies, or analytics cookies. All cookies are strictly necessary for the platform to function, which is why no consent banner is shown. The full list, including browser storage, is in our <Link href="/cookies" className="text-blue-600 hover:underline">cookie policy</Link>.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>6. Authentication &amp; Sessions</h2>
            <p className="text-ink leading-relaxed mb-4">GetAhead AI uses NextAuth (Auth.js) with short-lived, encrypted JWT sessions. This means:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Your session token is a signed, encrypted JWT stored in an HTTP-only cookie — not readable or decodable by JavaScript running in your browser.</li>
              <li>Sessions expire after about 15 minutes of inactivity, and refresh automatically while you&apos;re actively using the site.</li>
              <li>Session tokens are stored in HTTP-only, Secure, SameSite=Lax cookies — inaccessible to JavaScript.</li>
              <li>Signing out and changing your password are both designed to invalidate your other sessions immediately; in every case, a session stops working on its own within 15 minutes regardless.</li>
            </ul>
          </section>

          <hr className="border-rule" />

          <section id="section-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>7. Data Sharing</h2>
            <p className="text-ink leading-relaxed mb-4">We do not sell, rent, or trade your personal data. We share data only with the following trusted sub-processors, strictly as required to operate the service:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li><strong>Aiven Cloud</strong> — MySQL database hosting (data encrypted at rest, SOC 2 compliant).</li>
              <li><strong>Google Gemini API</strong> — AI evaluation and question generation (answer text sent per-request).</li>
              <li><strong>Resend</strong> — Transactional email delivery (password reset, support notifications, and internal operational alerts).</li>
              <li><strong>Vercel</strong> — Application hosting and deployment infrastructure, and Vercel Blob for storing uploaded answer-sheet files.</li>
              <li><strong>Sentry</strong> — Server and client error tracking. Answer sheet content, OCR text, model responses, and request bodies are stripped before any error report is sent — Sentry only ever receives error messages, stack traces, and non-content metadata (e.g. which processing stage failed).</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">We may disclose data to law enforcement or regulatory authorities only when legally required to do so, and only to the minimum extent necessary.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>8. Data Retention</h2>
            <p className="text-ink leading-relaxed mb-4">We retain your data for as long as your account is active. Specifically:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Account data and evaluations are retained indefinitely while your account is active.</li>
              <li>When you delete your account (Settings → Security → Danger zone), all associated data (evaluations, reports, question papers, sessions, uploaded files) is permanently deleted immediately — well within our 7-day commitment.</li>
              <li>Audit logs are retained for 12 months, then automatically purged by a scheduled job.</li>
              <li>Error logs are retained for 30 days, then automatically purged by the same scheduled job.</li>
              <li>When you delete your account, the uploaded answer-sheet files themselves are removed from our file storage, and the cached copy of each sheet&apos;s extracted text and grading is erased as well — not only the database rows.</li>
              <li>Support tickets are kept as a support record even if you later delete your account (they are unlinked from it), and are automatically deleted 12 months after they are resolved or closed.</li>
            </ul>
          </section>

          <hr className="border-rule" />

          <section id="section-9">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>9. Your Rights</h2>
            <p className="text-ink leading-relaxed mb-4">You have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li><strong>Access</strong> — Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction</strong> — Request correction of inaccurate personal data.</li>
              <li><strong>Deletion</strong> — Request permanent deletion of your account and all associated data.</li>
              <li><strong>Portability</strong> — Request your evaluation data in a machine-readable format.</li>
              <li><strong>Objection</strong> — Object to specific processing of your data.</li>
              <li><strong>Withdraw consent</strong> — Withdraw the consent you gave at signup at any time (see section 12). Withdrawal is as easy as giving it: delete your account from Settings, or write to us.</li>
              <li><strong>Nominate</strong> — Under the DPDP Act you may nominate another person to exercise these rights on your behalf if you die or become incapacitated.</li>
              <li><strong>Complain</strong> — Raise a grievance with our grievance officer (section 14) and, if not resolved to your satisfaction, with the Data Protection Board of India.</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">To exercise any of these rights, contact us via our <Link href="/contact" className="text-blue-600 hover:underline">Contact page</Link> or the privacy address in section 16. We will respond within 30 days, and sooner where the law requires. We may ask you to verify that you are the account holder before acting on a request.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>10. Data Security</h2>
            <p className="text-ink leading-relaxed mb-4">We implement the following security measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>All traffic encrypted via HTTPS/TLS (enforced in production)</li>
              <li>Passwords hashed with bcrypt (cost factor 12) — never stored in plaintext</li>
              <li>Short-lived JWT sessions (15 minutes) with server-side revocation on sign-out and password change</li>
              <li>HTTP-only, Secure, SameSite cookies to prevent XSS and CSRF</li>
              <li>Rate limiting on all authentication endpoints</li>
              <li>Security headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy</li>
              <li>Input validation on all API endpoints using Zod</li>
              <li>Role-based access control — data is isolated per user account</li>
              <li>Automated weekly dependency vulnerability scanning and update pull requests, plus a scan on every dependency change</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">Despite our best efforts, no system is perfectly secure. In the event of a personal data breach we will notify the Data Protection Board of India and every affected user without delay, and in any case within 72 hours of becoming aware of it, by email — describing what happened, what data was involved, and what we are doing about it.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-11">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>11. Children and Students Under 18</h2>
            <p className="text-ink leading-relaxed mb-4">Many of our users are school students. Under the DPDP Act, anyone under 18 is a child, and a child&apos;s personal data may only be processed with the verifiable consent of a parent or lawful guardian. Accordingly:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>When you create an account you must confirm that you are 18 or older, <strong>or</strong> that your parent or guardian has agreed to your use of GetAhead AI. We record that confirmation against your account.</li>
              <li>If a teacher, coaching centre, or institution uploads answer sheets written by students under 18, that organisation is responsible for holding the parents&apos; consent and for using the results only for the students&apos; education.</li>
              <li>We do not track children&apos;s behaviour across sites, build profiles of them, or show them targeted advertising — the DPDP Act prohibits this, and we don&apos;t do it for adults either.</li>
              <li>Parents and guardians may ask us to show, correct, or delete a child&apos;s data at any time using the contacts in section 16; we will act on such requests promptly after verifying the relationship.</li>
              <li>We do not knowingly allow anyone under 13 to create their own account. If you believe a child has provided us with personal data without a parent&apos;s consent, contact us and we will delete it.</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">We are aware that a signup checkbox is a self-declaration rather than the &quot;verifiable&quot; consent the DPDP Rules describe. As those Rules&apos; verification mechanisms become available we will adopt them; until then this is the strongest confirmation we can obtain without collecting identity documents from children, which would itself be a greater privacy risk.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>12. Legal Basis and Withdrawing Consent</h2>
            <p className="text-ink leading-relaxed mb-4">We process your personal data on the following bases:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li><strong>Your consent</strong>, given by ticking the box when you create an account, for everything in sections 1–4. You may withdraw it at any time by deleting your account (Settings → Security) or by writing to us; withdrawal does not affect processing that already happened, and after withdrawal we will stop and erase your data as described in section 8.</li>
              <li><strong>Voluntarily provided data</strong> (DPDP Act s.7(a)) when you contact support or give feedback — we use it only for the purpose you gave it for.</li>
              <li><strong>Legal obligations</strong>, for example retaining records we are required to keep or responding to a lawful order.</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">We do not sell personal data, use it for advertising, or make automated decisions about you that have legal or similarly significant effects. AI-generated marks are a study aid for you or your teacher, not an official result.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-13">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>13. Users Outside India</h2>
            <p className="text-ink leading-relaxed">GetAhead AI is operated from India and built for the Indian school system. If you use it from elsewhere, your data is transferred to and processed in India and in the regions used by the providers in section 7 (which include the United States). If you are in the European Economic Area or the United Kingdom, the rights in section 9 apply to you under the GDPR/UK GDPR in the same way, our legal basis is your consent (Article 6(1)(a)) or our legitimate interest in running a secure service, and you may also complain to your local supervisory authority. You may request a copy of your data in a portable format at any time.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>14. Grievance Redressal</h2>
            <p className="text-ink leading-relaxed">If you have a complaint about how we handle your personal data, contact our grievance officer using the details in section 16. As required by the IT Rules, 2021, we acknowledge complaints within 24 hours and resolve them within 15 days. If you are not satisfied with our response, you may approach the Data Protection Board of India.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-15">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>15. Changes to This Policy</h2>
            <p className="text-ink leading-relaxed">We may update this Privacy Policy from time to time. When we make significant changes, we will update the &quot;Effective date&quot; at the top of this page and notify registered users via email at least 14 days before the changes take effect. Your continued use of GetAhead AI after the effective date constitutes acceptance of the updated policy.</p>
          </section>

          <hr className="border-rule" />

          <section id="section-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>16. Contact Us</h2>
            <p className="text-ink leading-relaxed mb-4">For any privacy-related questions, requests, or concerns:</p>
            <LegalEntityBlock />
          </section>

        </div>
      </article>

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-graphite transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-graphite">Privacy policy</span>
        </nav>
      </div>

      </main>
      <SiteFooter />
    </div>
  );
}
