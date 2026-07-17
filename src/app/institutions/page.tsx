import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
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
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "For Institutions — GetAhead AI",
  description: "GetAhead AI helps schools and institutions centralise AI evaluation, monitor department performance, and provide consistent grading across all teachers.",
  openGraph: {
    title: "For Institutions — GetAhead AI",
    description: "Centralised AI evaluation, department analytics, and administrative controls for schools and educational institutions.",
    type: "website",
  },
};

export default function InstitutionsPage() {
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
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <Building2 className="w-4 h-4" />
                For schools &amp; institutions
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
                Consistent grading.<br />
                <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">Institution-wide.</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                GetAhead AI brings AI-powered evaluation to your entire institution — with centralised access, consistent grading standards, and performance insights across every department.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-medium px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                  Contact Sales <ChevronRight className="w-4 h-4" />
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
                  <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Built for institutional scale
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Whether you&apos;re a single-campus school or a multi-department coaching network, GetAhead AI adapts to your operational needs.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              icon: Building2,
              title: "Centralised Institution Dashboard",
              description: "An administrative view gives your leadership team visibility into evaluation activity across all teachers — total evaluations, subjects covered, and overall performance trends.",
              status: "In development",
            },
            {
              icon: Users,
              title: "Multiple Teacher Accounts",
              description: "Each teacher creates their own account under the Institution role. They evaluate independently with their own data, while admin has oversight of aggregate activity.",
              status: "Available now",
            },
            {
              icon: BarChart3,
              title: "Department Performance Monitoring",
              description: "Track average evaluation scores by subject across your institution. Identify underperforming areas and address them proactively — backed by real data.",
              status: "Analytics available",
            },
            {
              icon: Shield,
              title: "Secure Data Architecture",
              description: "All user data is isolated at the account level. Teachers cannot access each other's evaluations or student data. Data is encrypted at rest and in transit.",
              status: "Production-grade",
            },
            {
              icon: Settings,
              title: "Administrative Controls",
              description: "Admin accounts can view all users, reset passwords, suspend accounts, and review audit logs — all from a secure admin dashboard.",
              status: "Admin panel available",
            },
            {
              icon: Database,
              title: "Data Export & Archival",
              description: "Evaluation reports can be exported as PDFs and stored offline. Cloud data is retained for as long as the account is active with no storage limits.",
              status: "Available now",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100 whitespace-nowrap">{item.status}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
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
              <h2 className="text-3xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-poppins)" }}>
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
                    <p className="text-gray-700 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-8">
              <Shield className="w-12 h-12 text-purple-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Data belongs to you</h3>
              <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                Your students&apos; answer sheet content is not stored permanently by GetAhead AI beyond your account records. We do not sell or share your data with third parties.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                You can delete your account and all associated data at any time from Settings. Deletion is permanent and cannot be undone.
              </p>
              <Link href="/privacy" className="inline-flex items-center gap-2 text-purple-600 font-semibold text-sm hover:underline">
                Read our full Privacy Policy <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
            Bring AI evaluation to your institution
          </h2>
          <p className="text-purple-100 text-lg mb-8">
            Start with a free account. Institutional features and custom plans available on request.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-purple-600 font-bold px-8 py-4 rounded-xl hover:bg-purple-50 transition-colors shadow-lg group">
              Start Free <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-colors border border-white/20">
              Talk to Us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
