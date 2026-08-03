import { prisma } from "@/lib/prisma";

export type QuotaKind = "EVALUATION" | "PAPER_GENERATION";

// Matches the "Free plan includes 10 credits" copy already shown in the
// upload UI — enforced here for the first time rather than just displayed.
export const DAILY_QUOTA: Record<QuotaKind, number> = {
  EVALUATION: 10,
  PAPER_GENERATION: 10,
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

/** Read-only check, for UI to show "X of Y used today" without consuming a unit. */
export async function getQuotaUsage(userId: string, kind: QuotaKind): Promise<{ used: number; limit: number; resetsAt: Date }> {
  const date = todayUtc();
  const limit = DAILY_QUOTA[kind];
  const row = await prisma.usageCounter.findUnique({
    where: { userId_kind_date: { userId, kind, date } },
  });
  return { used: row?.count ?? 0, limit, resetsAt: nextResetUtc() };
}
