"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't send a reset link to that address. Double-check it and try again.");
      } else {
        setSuccess(true);
        setMessage(data.message || "A password reset link has been sent to your email inbox.");
        setEmail("");
      }
    } catch {
      setError("Couldn't reach the server to send the reset link. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface border border-rule rounded-3xl card-shadow-lg p-8"
      >
        {/* Header Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 select-none">
          <div className="w-10 h-10 rounded-2xl bg-fixed-ink flex items-center justify-center text-white shadow-md shadow-blue-500/10">
            <Brain className="w-5.5 h-5.5" />
          </div>
          <span className="font-bold text-ink text-lg" style={{ fontFamily: "var(--font-display)" }}>
            GetAhead AI
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-ink mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Forgot password
          </h1>
          <p className="text-sm text-graphite dark:text-graphite">
            Enter your email address and we&apos;ll send you a secure link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400 rounded-2xl p-4 text-sm flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Link sent!</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">{message}</p>
              </div>
            </div>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 border border-rule text-ink font-semibold py-3 rounded-2xl hover:bg-paper dark:hover:bg-gray-800 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-rule rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper font-semibold py-3 rounded-2xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Send password reset link"
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
