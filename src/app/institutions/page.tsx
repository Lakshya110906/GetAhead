import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Shield,
  Settings,
  Lock,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  Building2,
  Layers,
  Database,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "For institutions",
  description: "GetAhead AI helps schools and institutions centralise AI evaluation, monitor department performance, and provide consistent grading across all teachers.",
  alternates: { canonical: "/institutions" },
  openGraph: {
    title: "For institutions — GetAhead AI",
    description: "Centralised AI evaluation, department analytics, and administrative controls for schools and educational institutions.",
    url: "/institutions",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "For institutions — GetAhead AI",
    description: "Centralised AI evaluation, department analytics, and administrative controls for schools and educational institutions.",
    images: ["/og-image.png"],
  },
};

export default function InstitutionsPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-paper">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <Building2 className="w-4 h-4" />
                For schools and institutions
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                Consistent grading.<br />
                <span className="text-ink">Institution-wide.</span>
              </h1>
              <p className="text-xl text-graphite leading-relaxed mb-8">
                GetAhead AI brings AI-powered evaluation to your entire institution — with centralised access, consistent grading standards, and performance insights across every department.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-ink text-paper font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg">
                  Get started free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-surface text-ink font-medium px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                  Contact sales <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "Centralised dashboard", desc: "One admin view for all teachers and evaluations", icon: Layers },
                { label: "Multiple teacher accounts", desc: "Each teacher logs in separately with their own data", icon: Users },
                { label: "Department analytics", desc: "Filter performance by subject and department", icon: BarChart3 },
                { label: "Secure data isolation", desc: "Each user sees only their own data by default", icon: Lock },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-surface rounded-xl border border-rule shadow-sm p-4 flex items-start gap-4">
                    <div className="w-10 h-10 bg-fixed-ink rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                      <p className="text-xs text-graphite mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Built for institutional scale
          </h2>
          <p className="text-graphite text-lg max-w-2xl mx-auto">
            Whether you&apos;re a single-campus school or a multi-department coaching network, GetAhead AI adapts to your operational needs.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              icon: Building2,
              title: "Centralised institution dashboard",
              description: "An administrative view gives your leadership team visibility into evaluation activity across all teachers — total evaluations, subjects covered, and overall performance trends.",
              status: "In development",
            },
            {
              icon: Users,
              title: "Multiple teacher accounts",
              description: "Each teacher creates their own account under the Institution role. They evaluate independently with their own data, while admin has oversight of aggregate activity.",
              status: "Available now",
            },
            {
              icon: BarChart3,
              title: "Department performance monitoring",
              description: "Track average evaluation scores by subject across your institution. Identify underperforming areas and address them proactively — backed by real data.",
              status: "Analytics available",
            },
            {
              icon: Shield,
              title: "Secure data architecture",
              description: "All user data is isolated at the account level. Teachers cannot access each other's evaluations or student data. Data is encrypted at rest and in transit.",
              status: "Production-grade",
            },
            {
              icon: Settings,
              title: "Administrative controls",
              description: "Admin accounts can view all users, reset passwords, suspend accounts, and review audit logs — all from a secure admin dashboard.",
              status: "Admin panel available",
            },
            {
              icon: Database,
              title: "Data export and archival",
              description: "Evaluation reports can be exported as PDFs and stored offline. Cloud data is retained for as long as the account is active with no storage limits.",
              status: "Available now",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-surface rounded-2xl border border-rule shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-fixed-ink flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100 whitespace-nowrap">{item.status}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-graphite leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Security you can trust with sensitive academic data
              </h2>
              <div className="space-y-4">
                {[
                  "HTTPS/TLS encryption for all data in transit",
                  "Passwords hashed with bcrypt — never stored in plaintext",
                  "Database sessions with automatic expiry",
                  "HTTP-only, Secure, SameSite cookies",
                  "Role-based access control (Student / Teacher / Institution / Admin)",
                  "Complete audit logging of admin actions",
                  "Data stored on Aiven Cloud (SOC 2 compliant infrastructure)",
                  "No third-party tracking or advertising on the platform",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-ink text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-paper rounded-2xl border border-purple-100 p-8">
              <Shield className="w-12 h-12 text-purple-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Data belongs to you</h3>
              <p className="text-graphite mb-4 leading-relaxed text-sm">
                Your students&apos; answer sheet content (OCR-extracted text) is retained in your account for as long as it&apos;s active, so evaluation reports stay available in the dashboard — see our <Link href="/privacy" className="text-purple-600 hover:underline">privacy policy</Link> for the full retention schedule. We do not sell your data, and never share it beyond the sub-processors disclosed there.
              </p>
              <p className="text-graphite mb-6 leading-relaxed text-sm">
                You can delete your account and all associated data at any time from Settings. Deletion is permanent and cannot be undone.
              </p>
              <Link href="/privacy" className="inline-flex items-center gap-2 text-purple-600 font-semibold text-sm hover:underline">
                Read our full privacy policy <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-fixed-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Bring AI evaluation to your institution
          </h2>
          <p className="text-purple-100 text-lg mb-8">
            Start with a free account. Institutional features and custom plans available on request.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-surface text-purple-600 font-bold px-8 py-4 rounded-xl hover:bg-purple-50 transition-colors shadow-lg group">
              Start free <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-colors border border-white/20">
              Talk to us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
