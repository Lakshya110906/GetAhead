import { prisma } from "@/lib/prisma";

export type QuotaKind = "EVALUATION" | "PAPER_GENERATION" | "TUTOR";

// Matches the "Free plan includes 10 credits" copy already shown in the
// upload UI — enforced here for the first time rather than just displayed.
// TUTOR is a message-level daily cap on top of the existing 30-per-60s rate
// limit in the tutor stream route — the rate limit stops bursts, this stops
// one user's tutor conversation from consuming unbounded model spend across
// a whole day, same as every other Gemini-calling feature.
// These are NOT independent per-user allowances — they exist against a
// single shared Gemini free-tier ceiling (RPD=20 for the whole project,
// confirmed live), not a per-user one. With batched grading (2 real calls
// per evaluation, flat, regardless of sheet size — see
// answerSheetGrading.ts's gradingMode default) the whole app can serve
// roughly 10 evaluations/day, total, across every user, or ~6 paper
// generations at best case (3 calls each). The numbers below were 10/10
// before this pass — mathematically impossible to honor for even a single
// user on a day anyone else also used the app; the shared-ceiling gate
// (assertQuotaHeadroom, checked before these per-user counters) is what
// actually prevents overpromising in practice, and its live number is now
// surfaced to users (see GET /api/quota-status) rather than only shown in
// the admin dashboard.
export const DAILY_QUOTA: Record<QuotaKind, number> = {
  EVALUATION: 5,
  PAPER_GENERATION: 3,
  TUTOR: 50,
};

export class QuotaExceededError extends Error {
  readonly kind: QuotaKind;
  readonly limit: number;
  readonly resetsAt: Date;

  constructor(kind: QuotaKind, limit: number, resetsAt: Date) {
    super(
      `Daily ${kind === "EVALUATION" ? "evaluation" : "question paper"} limit of ${limit} reached. Resets at ${resetsAt.toISOString()}.`
    );
    this.name = "QuotaExceededError";
    this.kind = kind;
    this.limit = limit;
    this.resetsAt = resetsAt;
  }
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function nextResetUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
}

/**
 * Atomically consumes one unit of today's quota for this user+kind and
 * returns the count including this request. DB-backed (not in-memory) so
 * it's correct across every serverless invocation. Safe under concurrent
 * requests: each call is a single atomic increment; if that increment pushes
 * the count over the limit, it's compensated with a decrement and rejected
 * — at most one request can be the one that goes over.
 *
 * Throws QuotaExceededError if the limit is already reached. Call this at
 * enqueue time, before any paid model call is made.
 */
export async function consumeQuota(userId: string, kind: QuotaKind): Promise<{ used: number; limit: number }> {
  const date = todayUtc();
  const limit = DAILY_QUOTA[kind];

  const row = await prisma.usageCounter.upsert({
    where: { userId_kind_date: { userId, kind, date } },
    create: { userId, kind, date, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (row.count > limit) {
    await prisma.usageCounter.update({ where: { id: row.id }, data: { count: { decrement: 1 } } });
    throw new QuotaExceededError(kind, limit, nextResetUtc());
  }

  return { used: row.count, limit };
}

/**
 * Releases one previously-consumed unit for today. consumeQuota() is called
 * before generation starts (so quota reflects "attempted", not just
 * "succeeded", protecting against retry storms) — but a hard pipeline
 * failure the user did nothing wrong to cause (daily Gemini quota exhausted,
 * or the repair loop couldn't produce a valid paper after 3 attempts)
 * shouldn't cost them one of their 10 daily generations for nothing. Call
 * this from the failure path for those specific, non-user-caused failures
 * only — never for ordinary validation errors on the user's own input.
 */
export async function refundQuota(userId: string, kind: QuotaKind): Promise<void> {
  const date = todayUtc();
  const row = await prisma.usageCounter.findUnique({ where: { userId_kind_date: { userId, kind, date } } });
  if (row && row.count > 0) {
    await prisma.usageCounter.update({ where: { id: row.id }, data: { count: { decrement: 1 } } });
  }
}

/** Read-only check, for UI to show "X of Y used today" without consuming a unit. */
export async function getQuotaUsage(userId: string, kind: QuotaKind): Promise<{ used: number; limit: number; resetsAt: Date }> {
  const date = todayUtc();
  const limit = DAILY_QUOTA[kind];
  const row = await prisma.usageCounter.findUnique({
    where: { userId_kind_date: { userId, kind, date } },
  });
  return { used: row?.count ?? 0, limit, resetsAt: nextResetUtc() };
}
