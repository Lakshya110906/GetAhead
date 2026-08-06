import Link from "next/link";
import { Brain } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "FAQ", href: "/faq" },
  ],
  "For Users": [
    { label: "Students", href: "/students" },
    { label: "Teachers", href: "/teachers" },
    { label: "Institutions", href: "/institutions" },
    { label: "Coaching Centers", href: "/coaching-centers" },
  ],
  Support: [
    { label: "Help Center", href: "/help" },
    { label: "Contact Us", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-fixed-ink flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>
                Get<span className="text-gray-300">Ahead</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-gray-300 mb-6">
              AI-powered exam evaluation for students, teachers, and institutions. Upload answer sheets, get instant feedback, and track performance over time.
            </p>
          </div>

          {/* Nav columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-white font-semibold text-sm mb-4 tracking-wide">{title}</h3>
              <ul>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center min-h-11 text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-8 text-xs text-gray-300 text-center sm:text-left">
          <p>© {new Date().getFullYear()} GetAhead AI. All rights reserved. Built for students across India.</p>
        </div>
      </div>
    </footer>
  );
}
