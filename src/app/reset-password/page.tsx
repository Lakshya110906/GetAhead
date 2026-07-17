"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle, XCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      const t = setTimeout(() => {
        setError("No password reset token was found in the URL. Please verify you clicked the correct link from your email.");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError("");
    setSuccess(false);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess(true);
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl card-shadow-lg p-8"
      >
        {/* Header Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 select-none">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/10">
            <Brain className="w-5.5 h-5.5" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg" style={{ fontFamily: "var(--font-poppins)" }}>
            GetAhead AI
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
            Reset Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose a strong new password with at least 8 characters.
          </p>
        </div>

        {success ? (
          <div className="space-y-6 py-2 text-center">
            <div className="w-14 h-14 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Password Reset Complete</h3>
              <p className="text-xs text-gray-500 dark:text-gray-450 mt-1.5 leading-relaxed">
                Your password has been successfully updated. You can now sign in with your new credentials.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-blue-600 to-teal-500 text-white font-semibold py-3 rounded-2xl hover:opacity-95 transition-opacity text-sm shadow-md shadow-blue-500/10"
            >
              Sign In Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-750 dark:text-red-450 rounded-xl px-4 py-3 text-sm flex items-start gap-2.5 shadow-sm">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-450 mt-0.5 flex-shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min 8 chars)"
                  required
                  disabled={!token}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-gray-800 dark:bg-gray-950 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  disabled={!token}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={!token}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-gray-800 dark:bg-gray-950 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-gradient-to-br from-blue-600 to-teal-500 text-white font-semibold py-3 rounded-2xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Reset Password"
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs font-semibold text-blue-600 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
