"use client";

import { useEffect, useState } from "react";

interface QuotaStatus {
  remaining: number;
  limit: number;
  level: "ok" | "warn" | "block";
  resetsAt: string;
}

// Surfaces the REAL, shared constraint — Gemini's own daily quota, shared
// across every user of the app — before someone starts an operation. The
// per-user "you have N left today" counters (src/lib/quota.ts) are a
// secondary limit; this is the one that actually determines whether an
// operation can finish. A user must never be told (implicitly, by omission)
// that quota is available when this shared ceiling is the real blocker.
export function SharedQuotaBadge() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  // A failed fetch used to render nothing — the exact omission this
  // component's whole purpose is to prevent. If the badge can't tell you
  // the real state, it must say so, not go silent and let that read as
  // "everything's fine."
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/quota-status")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then(setStatus)
      .catch(() => setLoadError(true));
  }, []);

  if (loadError) {
    return <p className="text-xs text-graphite">Couldn&apos;t check the shared AI quota — it may be limited.</p>;
  }

  if (!status) return null;

  const color =
    status.level === "block" ? "text-red-600 dark:text-red-400" : status.level === "warn" ? "text-amber-600 dark:text-amber-400" : "text-graphite";

  return (
    <p className={`text-xs ${color}`}>
      {status.level === "block"
        ? `Shared daily AI quota is exhausted for today (resets at ${new Date(status.resetsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}). New requests will be refused, not queued.`
        : `${status.remaining} of ${status.limit} shared AI requests remaining today, across all users.`}
    </p>
  );
}
