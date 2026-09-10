import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalEntityBlock } from "@/components/LegalEntityBlock";
import { LEGAL } from "@/lib/legalConfig";
import { DAILY_QUOTA } from "@/lib/quotaLimits";

export const metadata: Metadata = {
  title: "Refund & cancellation policy",
  description:
    "GetAhead AI is free during beta and takes no payments. This page explains what that means, how to cancel, and what will apply if paid plans are ever introduced.",
  alternates: { canonical: "/refund" },
  openGraph: {
    title: "Refund & cancellation policy — GetAhead AI",
    description: "GetAhead AI is free during beta and takes no payments. How to cancel, and what applies if paid plans are introduced.",
    url: "/refund",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Refund & cancellation policy — GetAhead AI",
    description: "GetAhead AI is free during beta and takes no payments. How to cancel, and what applies if paid plans are introduced.",
    images: ["/og-image.png"],
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="pt-32 pb-12 bg-paper">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              <ReceiptText className="w-4 h-4" aria-hidden="true" />
              Free during beta
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Refund &amp; cancellation policy
            </h1>
            <p className="text-graphite mb-3">
              Effective date: <strong>{LEGAL.effectiveDate}</strong>
            </p>
            <p className="text-graphite leading-relaxed">
              The short version: we don&apos;t charge for anything yet, so there is nothing to refund. This page exists so that is stated
              plainly, so you know how to stop using the service, and so the rules are already public before any paid plan appears.
            </p>
          </div>
        </section>

        <article className="py-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            <section aria-labelledby="refund-current">
              <h2 id="refund-current" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                1. What you pay today: nothing
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-ink">
                <li>GetAhead AI is free during its beta period. We do not collect card details, UPI IDs, or any other payment information.</li>
                <li>
                  Every account has a daily usage limit (currently {DAILY_QUOTA.EVALUATION} answer-sheet evaluations and{" "}
                  {DAILY_QUOTA.PAPER_GENERATION} question papers per day). These are not purchased credits — they reset each day and cannot
                  be bought, transferred, or refunded.
                </li>
                <li>Because no money changes hands, no refund can arise from use of the service in its current form.</li>
              </ul>
            </section>

            <hr className="border-rule" />

            <section aria-labelledby="refund-cancel">
              <h2 id="refund-cancel" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                2. Cancelling
              </h2>
              <p className="text-ink leading-relaxed mb-4">There is no subscription to cancel. To stop using GetAhead AI:</p>
              <ul className="list-disc pl-6 space-y-2 text-ink">
                <li>Simply stop signing in — an inactive account costs you nothing and is never charged.</li>
                <li>
                  To remove your data, delete your account from <strong>Settings → Security → Danger zone</strong>. Deletion is immediate and
                  permanent: your evaluations, reports, question papers, and account details are erased as described in the{" "}
                  <Link href="/privacy#section-8" className="text-blue-600 hover:underline">
                    privacy policy
                  </Link>
                  .
                </li>
              </ul>
            </section>

            <hr className="border-rule" />

            <section aria-labelledby="refund-future">
              <h2 id="refund-future" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                3. If we introduce paid plans
              </h2>
              <p className="text-ink leading-relaxed mb-4">
                We may offer optional paid features in future. If we do, the following commitments will apply from the day the first paid
                plan goes live, and this page will be updated with the specifics (prices, billing cycle, and the exact refund window) before
                anyone can be charged:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink">
                <li>
                  <strong>Advance notice.</strong> Registered users will be told by email at least 14 days before pricing takes effect. Nothing
                  you used while the service was free will ever be charged for retroactively.
                </li>
                <li>
                  <strong>Clear pricing before payment.</strong> The total price including all taxes, the billing period, and what is
                  included will be shown before you confirm any payment, as required by the Consumer Protection (E-Commerce) Rules, 2020.
                </li>
                <li>
                  <strong>Refund window.</strong> A paid plan will be refundable in full if you cancel within 7 days of your first payment;
                  the exact conditions will be stated here before any plan goes live.
                </li>
                <li>
                  <strong>Cancel any time.</strong> Any subscription will be cancellable from Settings with no penalty; you keep access until the
                  end of the period already paid for.
                </li>
                <li>
                  <strong>Service failures.</strong> If a paid evaluation fails because of a fault on our side (for example, the AI provider is
                  unavailable), that use will not be counted against you.
                </li>
                <li>
                  <strong>Refund timing.</strong> Approved refunds will be returned to the original payment method within 7 working days of
                  approval; bank and card processing times may add to this.
                </li>
              </ul>
            </section>

            <hr className="border-rule" />

            <section aria-labelledby="refund-rights">
              <h2 id="refund-rights" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                4. Your statutory rights
              </h2>
              <p className="text-ink leading-relaxed">
                Nothing in this policy limits any right you have under the Consumer Protection Act, 2019 or other applicable law. If you are
                unhappy with how a complaint was handled, you can raise it with our grievance officer (details below) and, if unresolved,
                with the National Consumer Helpline (1915) or the consumer commission for your district.
              </p>
            </section>

            <hr className="border-rule" />

            <LegalEntityBlock />
          </div>
        </article>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-graphite transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
            <span className="text-graphite">Refund &amp; cancellation policy</span>
          </nav>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
