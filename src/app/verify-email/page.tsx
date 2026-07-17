"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, CheckCircle, XCircle, Loader2, ArrowRight, Mail } from "lucide-react";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email address...");
  
  // Resend state
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    if (!token) {
      const t = setTimeout(() => {
        setStatus("error");
        setMessage("No verification token was provided. Please check the link in your email inbox.");
      }, 0);
      return () => clearTimeout(t);
    }

    // Call verify endpoint
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || "Failed to verify email address");
          });
        }
        return res.json();
      })
      .then((data) => {
        setStatus("success");
        setMessage(data.message || "Your email address has been verified successfully!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "The verification link is invalid, expired, or already used.");
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendLoading(true);
    setResendError("");
    setResendSuccess(false);

    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendError(data.error || "Failed to resend verification link");
      } else {
        setResendSuccess(true);
        setResendEmail("");
      }
    } catch {
      setResendError("Failed to connect to server. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl card-shadow-lg overflow-hidden p-8 text-center"
      >
        {/* Header Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/10">
            <Brain className="w-5.5 h-5.5" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg" style={{ fontFamily: "var(--font-poppins)" }}>
            GetAhead AI
          </span>
        </div>

        {status === "loading" && (
          <div className="py-6 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
                Email Verified!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-2">
                {message} You can now log in and start using your GetAhead account.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-teal-500 text-white font-semibold py-3 rounded-2xl hover:opacity-95 transition-opacity text-sm shadow-md shadow-blue-500/10"
            >
              Sign In to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
                Verification Failed
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Resend Verification Form */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mt-6 text-left">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">
                Resend verification link
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-450 mb-4">
                Enter your email address below to request a new verification email.
              </p>

              {resendSuccess && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400 rounded-xl px-4 py-2.5 text-xs mb-4">
                  ✓ A new verification link has been sent to your email.
                </div>
              )}

              {resendError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-450 rounded-xl px-4 py-2.5 text-xs mb-4">
                  {resendError}
                </div>
              )}

              <form onSubmit={handleResend} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-205 dark:border-gray-800 dark:bg-gray-950 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  {resendLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Send Link
                </button>
              </form>
            </div>

            <div className="pt-2">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
