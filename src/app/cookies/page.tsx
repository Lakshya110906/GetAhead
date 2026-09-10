import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Cookie } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalEntityBlock } from "@/components/LegalEntityBlock";
import { LEGAL } from "@/lib/legalConfig";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "Exactly which cookies and browser storage GetAhead AI uses, what each one is for, and why no cookie consent banner is shown.",
  alternates: { canonical: "/cookies" },
  openGraph: {
    title: "Cookie policy — GetAhead AI",
    description: "Exactly which cookies and browser storage GetAhead AI uses, and why.",
    url: "/cookies",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie policy — GetAhead AI",
    description: "Exactly which cookies and browser storage GetAhead AI uses, and why.",
    images: ["/og-image.png"],
  },
};

// Every row below is a cookie or storage key that actually exists in this
// codebase (NextAuth 4.24's three default cookies — with the __Secure-/
// __Host- prefixes it applies over HTTPS, i.e. on the live site; the two
// localStorage keys from ThemeProvider.tsx and SubjectSelector.tsx). If a new one is added,
// add it here in the same change — a cookie policy that lists fewer
// cookies than the site sets is the exact thing this page exists to avoid.
const COOKIES = [
  {
    name: "__Secure-next-auth.session-token",
    kind: "Cookie",
    purpose:
      "Keeps you signed in. Encrypted, HttpOnly, Secure, SameSite=Lax — not readable by JavaScript. (On a local development build without HTTPS the same cookie is named next-auth.session-token.)",
    duration: "15 minutes, refreshed while you're active",
    category: "Strictly necessary",
  },
  {
    name: "__Host-next-auth.csrf-token",
    kind: "Cookie",
    purpose: "Protects sign-in and sign-out forms against cross-site request forgery.",
    duration: "Session",
    category: "Strictly necessary",
  },
  {
    name: "__Secure-next-auth.callback-url",
    kind: "Cookie",
    purpose: "Remembers which page to return you to after signing in.",
    duration: "Session",
    category: "Strictly necessary",
  },
  {
    name: "site-theme",
    kind: "Browser storage (localStorage)",
    purpose: "Remembers whether you chose the light or dark theme.",
    duration: "Until you clear site data",
    category: "Functional — your own preference",
  },
  {
    name: "getahead_custom_subjects",
    kind: "Browser storage (localStorage)",
    purpose: "Remembers custom subject names you've typed into the subject picker so you don't retype them.",
    duration: "Until you clear site data",
    category: "Functional — your own data",
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="pt-32 pb-12 bg-paper">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              <Cookie className="w-4 h-4" aria-hidden="true" />
              No tracking, no ads
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Cookie policy
            </h1>
            <p className="text-graphite mb-3">
              Effective date: <strong>{LEGAL.effectiveDate}</strong>
            </p>
            <p className="text-graphite leading-relaxed">
              This page lists every cookie and piece of browser storage GetAhead AI sets, what each is for, and how long it lasts. It is
              deliberately short, because we use very little.
            </p>
          </div>
        </section>

        <article className="py-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            <section aria-labelledby="cookies-why-no-banner">
              <h2 id="cookies-why-no-banner" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Why there is no cookie banner
              </h2>
              <p className="text-ink leading-relaxed mb-4">
                Cookie consent laws (the EU/UK ePrivacy rules, and the consent requirements under India&apos;s Digital Personal Data
                Protection Act, 2023) require your permission before a site stores anything on your device that is <em>not</em> strictly
                necessary to provide the service you asked for — typically analytics, advertising, and social-media tracking.
              </p>
              <p className="text-ink leading-relaxed mb-4">GetAhead AI sets none of those. Specifically, we do not use:</p>
              <ul className="list-disc pl-6 space-y-2 text-ink">
                <li>Analytics or audience-measurement cookies (no Google Analytics, no similar tools).</li>
                <li>Advertising, retargeting, or cross-site tracking cookies.</li>
                <li>Third-party embeds that set their own cookies (no embedded videos, maps, social widgets, or chat plugins).</li>
                <li>Externally loaded fonts or scripts — fonts are served from our own domain, so no font provider sees your visit.</li>
              </ul>
              <p className="text-ink leading-relaxed mt-4">
                Everything we do store is either required to keep you signed in securely or records a preference you set yourself. Those
                categories do not require a consent pop-up, so we don&apos;t show one. If that ever changes — if we add analytics, for example
                — this page will be updated and you will be asked first.
              </p>
            </section>

            <hr className="border-rule" />

            <section aria-labelledby="cookies-list">
              <h2 id="cookies-list" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                What we store on your device
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-rule rounded-xl overflow-hidden">
                  <caption className="sr-only">Cookies and browser storage set by GetAhead AI</caption>
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-ink">Name</th>
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-ink">Type</th>
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-ink">Purpose</th>
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-ink">Lasts</th>
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-ink">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {COOKIES.map((row) => (
                      <tr key={row.name} className="bg-surface align-top">
                        <td className="px-4 py-3 font-mono text-xs text-ink">{row.name}</td>
                        <td className="px-4 py-3 text-graphite whitespace-nowrap">{row.kind}</td>
                        <td className="px-4 py-3 text-graphite">{row.purpose}</td>
                        <td className="px-4 py-3 text-graphite">{row.duration}</td>
                        <td className="px-4 py-3 text-graphite">{row.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <hr className="border-rule" />

            <section aria-labelledby="cookies-third-parties">
              <h2 id="cookies-third-parties" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Third parties
              </h2>
              <p className="text-ink leading-relaxed mb-4">
                No third party sets cookies through this site. Our error-monitoring service (Sentry) receives error reports from your browser
                when something breaks, but it does so without setting cookies and without recording what you typed or uploaded — see the{" "}
                <Link href="/privacy#section-7" className="text-blue-600 hover:underline">
                  data sharing section of the privacy policy
                </Link>{" "}
                for the full list of providers we use and what each receives.
              </p>
            </section>

            <hr className="border-rule" />

            <section aria-labelledby="cookies-control">
              <h2 id="cookies-control" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Controlling cookies
              </h2>
              <p className="text-ink leading-relaxed mb-4">
                You can delete or block cookies and site data in your browser settings at any time (usually under Privacy or Site data).
                Because every cookie we set is needed for signing in, blocking them means you won&apos;t be able to stay signed in — the public
                pages will still work. Signing out removes your session cookie immediately.
              </p>
              <p className="text-ink leading-relaxed">
                The two browser-storage entries above hold only preferences you chose; clearing them simply resets the theme and your custom
                subject list.
              </p>
            </section>

            <hr className="border-rule" />

            <section aria-labelledby="cookies-changes">
              <h2 id="cookies-changes" className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Changes to this policy
              </h2>
              <p className="text-ink leading-relaxed">
                If we start using any cookie or storage that isn&apos;t listed here, we will update this page, change the effective date, and —
                for anything non-essential — ask for your consent before it is set.
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
            <span className="text-graphite">Cookie policy</span>
          </nav>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
