"use client";

import { useEffect, useState } from "react";

interface QuotaStatus {
  remaining: number;
  limit: number;
  level: "ok" | "warn" | "block";
  resetsAt: string;
  evaluationsLeft: number;
  papersLeft: number;
}

// Surfaces the REAL, shared constraint — Gemini's own daily quota, shared
// across every user of the app — before someone starts an operation. The
// per-user "you have N left today" counters (src/lib/quota.ts) are a
// secondary limit; this is the one that actually determines whether an
// operation can finish. A user must never be told (implicitly, by omission)
// that quota is available when this shared ceiling is the real blocker.
// Counted in what the user is about to start (an evaluation reserves 2
// requests, a paper 5), not raw requests: "3 requests left" read as room for
// a paper that the gate would refuse.
export function SharedQuotaBadge({ kind }: { kind: "evaluation" | "paper" }) {
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

  const left = kind === "evaluation" ? status.evaluationsLeft : status.papersLeft;
  const exhausted = left === 0;
  const color =
    exhausted ? "text-red-600 dark:text-red-400" : status.level === "warn" ? "text-amber-600 dark:text-amber-400" : "text-graphite";

  return (
    <p className={`text-xs ${color}`}>
      {exhausted
        ? `The shared daily AI quota can't fit another ${kind} today (resets at ${new Date(status.resetsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}). New ${kind}s will be refused, not queued.`
        : `Shared AI quota left today, across all users: enough for about ${left} more ${left === 1 ? kind : `${kind}s`}.`}
    </p>
  );
}
