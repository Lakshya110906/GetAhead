"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { motion } from "framer-motion";
import { Brain, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { DAILY_QUOTA } from "@/lib/quotaLimits";

const roles = [
  { value: "STUDENT", label: "Student" },
  { value: "TEACHER", label: "Teacher" },
  { value: "INSTITUTION", label: "Institution" },
];

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
    // Both are sent to the server as literal `true` and refused otherwise —
    // consent has to be an affirmative act, not a sentence under the button.
    acceptTerms: false,
    ageConsent: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [target.name]: target.type === "checkbox" ? target.checked : target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Sign the user straight in with the credentials they just typed —
      // no separate "go check your email" step. If this specific call
      // fails (as opposed to the signup above, which already succeeded),
      // fall back to the login page rather than leaving a blank screen.
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push(`/login?justSignedUp=true`);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Couldn't reach the server to create your account. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-fixed-ink flex-col justify-between p-12 text-white">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            GetAhead AI
          </span>
        </Link>

        <div>
          <h2 className="text-4xl font-bold mb-4 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            Join students and educators on GetAhead AI
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-10">
            Get answer sheet evaluations and AI question paper generation, free during beta.
          </p>
          <div className="space-y-3">
            {[
              `✓ Free during beta — ${DAILY_QUOTA.EVALUATION} evaluations/day`,
              "✓ Detailed AI-powered feedback",
              "✓ Subject-wise performance analytics",
              "✓ Personalized study recommendations",
            ].map((item) => (
              <p key={item} className="text-white/70 text-sm font-medium">
                {item}
              </p>
            ))}
          </div>
        </div>

        <p className="text-blue-200 text-sm">© 2026 GetAhead AI</p>
      </div>

      {/* Right Panel */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center px-6 py-12 bg-surface overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-fixed-ink flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              GetAhead AI
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Create account
          </h1>
          <p className="text-graphite mb-8">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">Full name</label>
              <div className="relative">
                <User aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-ink mb-1.5">Email address</label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-ink mb-1.5">I am a...</legend>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center justify-center py-2.5 px-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                      formData.role === r.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-graphite hover:border-gray-300"
                    }`}
                  >
                    {/* sr-only, not hidden: display:none removes the radio
                        from the tab order and from screen readers entirely,
                        so the role chooser was mouse-only. */}
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={formData.role === r.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-ink mb-1.5">Password</label>
              <div className="relative">
                <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="signup-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  aria-pressed={showPass}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-graphite"
                >
                  {showPass ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <label htmlFor="acceptTerms" className="flex items-start gap-3 text-sm text-ink cursor-pointer">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  required
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300"
                />
                <span>
                  I have read and agree to the{" "}
                  <Link href="/terms" className="text-blue-600 underline">terms of service</Link> and{" "}
                  <Link href="/privacy" className="text-blue-600 underline">privacy policy</Link>, including my answer
                  sheets being sent to Google&apos;s Gemini API for evaluation.
                </span>
              </label>
              <label htmlFor="ageConsent" className="flex items-start gap-3 text-sm text-ink cursor-pointer">
                <input
                  id="ageConsent"
                  name="ageConsent"
                  type="checkbox"
                  checked={formData.ageConsent}
                  onChange={handleChange}
                  required
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300"
                />
                <span>
                  I am 18 or older, <strong>or</strong> my parent or guardian has agreed to me using GetAhead.
                </span>
              </label>
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" /> Creating account…
                </>
              ) : (
                <>
                  Create account <ArrowRight aria-hidden="true" className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
