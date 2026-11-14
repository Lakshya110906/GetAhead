import { prisma } from "@/lib/prisma";

// Every retention rule the daily purge cron enforces, in one place, so the
// privacy policy's retention section and the code that makes it true can be
// read side by side. Before November 2026 the purge covered only ErrorLog
// and AuditLog, while four tables grew without bound: GeminiCallLog (with a
// userId on rows), RateLimit (every row expired, never removed), UsageCounter
// (only today's row is ever read), and dated alert-dedupe keys.
//
// Each window below is longer than anything that reads the table needs:
//   - GeminiCallLog: the quota gate (geminiQuotaState.ts) reads 24 hours.
//   - UsageCounter:  quota.ts reads and refunds today's row only.
//   - RateLimit:     rateLimit.ts treats a row past resetAt as absent and
//                    recreates it, so removing it changes no decision.
export const RETENTION = {
  errorLogDays: 30,
  auditLogDays: 365,
  closedTicketDays: 365,
  geminiCallLogDays: 90,
  usageCounterDays: 7,
  // A row past resetAt is dead to rateLimit.ts; the hour is a margin, not a requirement.
  rateLimitGraceHours: 1,
  alertDedupeDays: 7,
  // Reset links live an hour; the day after expiry is only a margin.
  resetTokenGraceDays: 1,
  // A GradingCache row is written moments BEFORE its evaluation records the
  // contentHash that references it (evaluationWorker.ts runJob). The age
  // guard means the purge can never remove a row in that window.
  orphanCacheMinAgeHours: 24,
} as const;

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface PurgeCounts {
  errorLogs: number;
  auditLogs: number;
  closedTickets: number;
  geminiCallLogs: number;
  usageCounters: number;
  rateLimits: number;
  resetTokens: number;
  revokedSessions: number;
  alertDedupeKeys: number;
  orphanCacheRows: number;
}

export async function purgeExpiredData(now: Date = new Date()): Promise<PurgeCounts> {
  const at = (ms: number) => new Date(now.getTime() - ms);

  const [errorLogs, auditLogs, closedTickets, geminiCallLogs, usageCounters, rateLimits, resetTokens, revokedSessions] = await Promise.all([
    prisma.errorLog.deleteMany({ where: { createdAt: { lt: at(RETENTION.errorLogDays * DAY) } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: at(RETENTION.auditLogDays * DAY) } } }),
    prisma.supportTicket.deleteMany({
      where: { status: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { lt: at(RETENTION.closedTicketDays * DAY) } },
    }),
    prisma.geminiCallLog.deleteMany({ where: { createdAt: { lt: at(RETENTION.geminiCallLogDays * DAY) } } }),
    // date is a "YYYY-MM-DD" string; ISO dates sort lexically in date order.
    prisma.usageCounter.deleteMany({ where: { date: { lt: utcDate(at(RETENTION.usageCounterDays * DAY)) } } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: at(RETENTION.rateLimitGraceHours * HOUR) } } }),
    prisma.passwordResetToken.deleteMany({ where: { expires: { lt: at(RETENTION.resetTokenGraceDays * DAY) } } }),
    // Past expiresAt the session couldn't be used anyway (7-day lifetime).
    prisma.revokedSession.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  const alertDedupeKeys = await purgeAlertDedupeKeys(at(RETENTION.alertDedupeDays * DAY));

  // An anti-join, which Prisma's query API can't express: cache rows that no
  // evaluation references any more. They hold an answer sheet's extracted
  // text with no user link of their own, so once orphaned, no account
  // deletion could ever reach them.
  const orphanCacheRows = await prisma.$executeRaw`
    DELETE g FROM GradingCache g
    LEFT JOIN Evaluation e ON e.contentHash = g.contentHash
    WHERE e.id IS NULL AND g.updatedAt < ${at(RETENTION.orphanCacheMinAgeHours * HOUR)}`;

  return {
    errorLogs: errorLogs.count,
    auditLogs: auditLogs.count,
    closedTickets: closedTickets.count,
    geminiCallLogs: geminiCallLogs.count,
    usageCounters: usageCounters.count,
    rateLimits: rateLimits.count,
    resetTokens: resetTokens.count,
    revokedSessions: revokedSessions.count,
    alertDedupeKeys,
    orphanCacheRows,
  };
}

// alertOncePerDay() (alerts.ts) writes one "<alertKey>:YYYY-MM-DD" row per
// alert per day. Only keys of exactly that shape are eligible, so real
// settings like "maintenanceMode" can never match.
const DATED_KEY = /^.+:(\d{4}-\d{2}-\d{2})$/;

async function purgeAlertDedupeKeys(before: Date): Promise<number> {
  const cutoff = utcDate(before);
  const rows = await prisma.systemSetting.findMany({ select: { key: true } });
  const expired = rows
    .map((r) => r.key)
    .filter((k) => {
      const m = DATED_KEY.exec(k);
      return m !== null && m[1] < cutoff;
    });
  if (expired.length === 0) return 0;
  const res = await prisma.systemSetting.deleteMany({ where: { key: { in: expired } } });
  return res.count;
}
