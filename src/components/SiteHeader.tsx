"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Brain, Menu, X } from "lucide-react";
import { ThemeSlider } from "@/components/ThemeSlider";

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-rule bg-paper/95 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-fixed-ink flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-xl font-bold text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Get<span className="text-ink">Ahead</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-colors text-graphite hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <ThemeSlider />
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-paper bg-ink rounded-lg px-5 py-2 hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium transition-colors px-4 py-2 whitespace-nowrap text-ink hover:text-graphite"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-semibold text-paper bg-ink rounded-lg px-5 py-2 hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                >
                  Start free
                </Link>
              </>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <ThemeSlider />
            <button
              className="p-2 text-ink"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-rule bg-paper px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-graphite"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="block text-paper bg-ink rounded-lg px-4 py-2 text-sm font-semibold text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="block text-sm font-medium text-ink"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="block text-paper bg-ink rounded-lg px-4 py-2 text-sm font-semibold text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start free
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
