import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Read the GetAhead AI Terms of Service covering user responsibilities, acceptable use, AI limitations, intellectual property, and liability.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of service — GetAhead AI",
    description: "Terms of Service for GetAhead AI — the AI-powered exam evaluation platform.",
    url: "/terms",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of service — GetAhead AI",
    description: "Terms of Service for GetAhead AI — the AI-powered exam evaluation platform.",
    images: ["/og-image.png"],
  },
};

const EFFECTIVE_DATE = "17 July 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-paper">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <FileText className="w-4 h-4" />
            Legal agreement
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Terms of service
          </h1>
          <p className="text-graphite mb-3">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
          </p>
          <p className="text-graphite leading-relaxed">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of GetAhead AI (&quot;the Service&quot;, &quot;we&quot;, &quot;our&quot;). By creating an account or using GetAhead AI, you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>
        </div>
      </section>

      {/* TOC */}
      <section className="py-8 border-b border-rule">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold text-graphite uppercase tracking-wide mb-4">Contents</h2>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              "1. Acceptance of Terms",
              "2. Your Account",
              "3. User Responsibilities",
              "4. Acceptable Use",
              "5. AI Limitations",
              "6. Intellectual Property",
              "7. Content You Upload",
              "8. Privacy",
              "9. Service Availability",
              "10. Termination",
              "11. Disclaimers",
              "12. Limitation of Liability",
              "13. Indemnification",
              "14. Changes to Terms",
              "15. Governing Law",
              "16. Contact",
            ].map((item) => (
              <a key={item} href={`#tos-${item.split(".")[0].trim()}`} className="flex items-center gap-1.5 text-graphite hover:text-blue-600 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                {item}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <article className="py-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-10">

          <section id="tos-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>1. Acceptance of Terms</h2>
            <p className="text-ink leading-relaxed">By registering for an account or using any part of GetAhead AI, you confirm that you have read, understood, and agree to these Terms and our <Link href="/privacy" className="text-blue-600 hover:underline">privacy policy</Link>. If you are using GetAhead AI on behalf of an organisation (school, coaching centre, institution), you represent that you have authority to bind that organisation to these Terms.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>2. Your Account</h2>
            <p className="text-ink leading-relaxed mb-4">You must provide accurate information when creating your account. You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Maintaining the confidentiality of your password.</li>
              <li>All activity that occurs under your account.</li>
              <li>Notifying us immediately of any unauthorised access to your account via our <Link href="/contact" className="text-blue-600 hover:underline">Contact page</Link>.</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">You may not share your account credentials with others or allow multiple individuals to use a single account. Each person must have their own account.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>3. User Responsibilities</h2>
            <p className="text-ink leading-relaxed mb-4">By using GetAhead AI, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Provide accurate, truthful information when creating your account.</li>
              <li>Use the Service only for lawful educational purposes.</li>
              <li>Not attempt to impersonate another person or entity.</li>
              <li>Not attempt to gain unauthorised access to other users&apos; data.</li>
              <li>Not use the Service to upload content that is illegal, obscene, or defamatory.</li>
              <li>Ensure you have the right to upload any answer sheet content you submit (e.g., your own answers or those you are authorised to evaluate).</li>
              <li>Comply with applicable local laws regarding educational data privacy where relevant (e.g., FERPA in the US, or PDPA in India).</li>
            </ul>
          </section>

          <hr className="border-rule" />

          <section id="tos-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>4. Acceptable Use</h2>
            <p className="text-ink leading-relaxed mb-3">The following activities are explicitly prohibited on GetAhead AI:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Attempting to reverse-engineer, decompile, or scrape the platform or its AI outputs at scale.</li>
              <li>Using automated scripts or bots to submit evaluations or generate content at non-human speeds.</li>
              <li>Attempting to circumvent rate limits, authentication systems, or access controls.</li>
              <li>Submitting content designed to manipulate or jailbreak the AI model into producing harmful output.</li>
              <li>Using the platform to evaluate content that contains illegal material, hate speech, or material that violates third-party intellectual property rights.</li>
              <li>Reselling or redistributing GetAhead AI evaluations or question papers as your own product without written permission.</li>
              <li>Using the platform to cheat in active examinations — for example, uploading examination papers that are under active non-disclosure agreements or submitting answers during a live proctored exam.</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">Violation of this section may result in immediate account suspension without notice.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>5. AI Limitations</h2>
            <p className="text-ink leading-relaxed mb-4">GetAhead AI uses generative AI (Google Gemini 2.5 Flash) to evaluate answer sheets and generate question papers. You acknowledge and accept the following limitations:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li><strong>Not infallible.</strong> AI evaluation may contain errors, particularly for highly subjective questions, niche academic topics, or unclear handwriting.</li>
              <li><strong>Not a substitute for expert judgement.</strong> For high-stakes or official examinations, AI evaluation should supplement — not replace — qualified teacher review.</li>
              <li><strong>No guarantee of accuracy.</strong> We strive for high accuracy but do not guarantee that every evaluation score is correct.</li>
              <li><strong>Generated papers are AI-generated.</strong> Question papers generated by the AI have not been verified by accredited curriculum experts. Use generated papers as practice material, not as official examination papers.</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">GetAhead AI is not liable for any academic consequences arising from reliance on AI-generated evaluations or question papers.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>6. Intellectual Property</h2>
            <p className="text-ink leading-relaxed mb-4"><strong>Our IP:</strong> The GetAhead AI platform, including its design, code, branding, and AI infrastructure, is owned by GetAhead AI and protected by applicable intellectual property law. You may not copy, modify, or distribute any part of the platform without our written consent.</p>
            <p className="text-ink leading-relaxed"><strong>Generated content:</strong> Question papers and evaluation reports generated by GetAhead AI for your personal use are provided to you for personal, educational use only. You may print and share individual reports for legitimate educational purposes. Commercial resale or redistribution requires written permission.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>7. Content You Upload</h2>
            <p className="text-ink leading-relaxed mb-4">You retain full ownership of the answer sheet content you upload. By uploading content to GetAhead AI, you grant us a limited, non-exclusive licence to process that content solely for the purpose of providing the evaluation service (including sending it to the Gemini API).</p>
            <p className="text-ink leading-relaxed">You represent that you have the right to upload the content you submit. Do not upload content containing personal data of minors without appropriate consent, confidential third-party material, or content that infringes third-party copyright.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>8. Privacy</h2>
            <p className="text-ink leading-relaxed">Your use of GetAhead AI is also governed by our <Link href="/privacy" className="text-blue-600 hover:underline">privacy policy</Link>, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of data as described in the Privacy Policy.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-9">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>9. Service Availability</h2>
            <p className="text-ink leading-relaxed mb-4">We aim to keep GetAhead AI available 24/7 but do not guarantee uninterrupted service. The platform may be unavailable during:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Scheduled maintenance (we will give advance notice where possible)</li>
              <li>Unplanned outages (database, AI API, or hosting infrastructure issues)</li>
              <li>Force majeure events</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">We do not provide uptime SLAs for free accounts. Enterprise SLA terms are available on request.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>10. Termination</h2>
            <p className="text-ink leading-relaxed mb-4"><strong>By you:</strong> You may delete your account at any time from Settings. Deletion is immediate and permanent.</p>
            <p className="text-ink leading-relaxed mb-4"><strong>By us:</strong> We reserve the right to suspend or terminate your account, with or without notice, if we determine that you have violated these Terms, engaged in fraudulent or abusive behaviour, or pose a security risk to the platform or other users.</p>
            <p className="text-ink leading-relaxed">Upon termination, your access to the platform and all associated data will be removed in accordance with our retention policy described in the privacy policy.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-11">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>11. Disclaimers</h2>
            <p className="text-ink leading-relaxed mb-4">The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We specifically disclaim:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Any warranty of merchantability, fitness for a particular purpose, or non-infringement.</li>
              <li>Any guarantee that the AI evaluation results are accurate, complete, or error-free.</li>
              <li>Any liability for outcomes resulting from reliance on AI-generated content (marks, feedback, question papers).</li>
            </ul>
          </section>

          <hr className="border-rule" />

          <section id="tos-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>12. Limitation of Liability</h2>
            <p className="text-ink leading-relaxed mb-4">To the maximum extent permitted by applicable law, GetAhead AI and its operators shall not be liable for:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink">
              <li>Indirect, incidental, consequential, special, or punitive damages.</li>
              <li>Loss of data, revenue, academic grades, or reputation arising from use of the Service.</li>
              <li>Any damages arising from reliance on AI-generated evaluation results.</li>
            </ul>
            <p className="text-ink leading-relaxed mt-4">Our total liability to you for any claim arising from use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim. Since the platform is currently free, our total maximum liability is ₹0 / $0.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-13">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>13. Indemnification</h2>
            <p className="text-ink leading-relaxed">You agree to indemnify, defend, and hold harmless GetAhead AI and its operators from any claims, damages, losses, or expenses (including reasonable legal fees) arising from: your violation of these Terms, your use of the Service, content you upload, or your violation of any third party&apos;s rights.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>14. Changes to Terms</h2>
            <p className="text-ink leading-relaxed">We may update these Terms at any time. When we make significant changes, we will notify registered users via email at least 14 days before the changes take effect and update the &quot;Effective date&quot; at the top of this page. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-15">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>15. Governing Law</h2>
            <p className="text-ink leading-relaxed">These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms or your use of GetAhead AI shall be subject to the exclusive jurisdiction of the courts in India.</p>
          </section>

          <hr className="border-rule" />

          <section id="tos-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>16. Contact</h2>
            <p className="text-ink leading-relaxed mb-4">For questions about these Terms:</p>
            <div className="bg-gray-50 rounded-2xl border border-rule p-6 space-y-2">
              <p className="text-ink"><strong>GetAhead AI</strong></p>
              <p className="text-ink">Legal enquiries and general support: use our <Link href="/contact" className="text-blue-600 hover:underline">Contact page</Link> ({SITE_URL.replace(/^https?:\/\//, "")}/contact) — we don&apos;t currently support email.</p>
            </div>
          </section>

        </div>
      </article>

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-graphite transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-graphite">Terms of service</span>
        </nav>
      </div>

      <SiteFooter />
    </div>
  );
}
