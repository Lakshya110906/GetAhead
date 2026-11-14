import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// A durable "last ran" record per cron. Until November 2026 nothing recorded
// cron executions anywhere that outlived Vercel's runtime-log retention (a
// few hours on Hobby), so "when did queue-alert last succeed?" had no answer
// — and a silently dead cron reads exactly like a healthy one. One
// SystemSetting row per cron, overwritten each run: "cron:lastRun:<name>"
// holds the time and outcome, "cron:lastSuccess:<name>" only moves on success.

export type CronName = "sweep-evaluations" | "queue-alert" | "purge-old-logs" | "sweep-paper-jobs";

export async function recordCronRun(name: CronName, ok: boolean, summary: Record<string, unknown>): Promise<void> {
  const value = JSON.stringify({ at: new Date().toISOString(), ok, ...summary });
  try {
    await prisma.systemSetting.upsert({
      where: { key: `cron:lastRun:${name}` },
      create: { key: `cron:lastRun:${name}`, value },
      update: { value },
    });
    if (ok) {
      await prisma.systemSetting.upsert({
        where: { key: `cron:lastSuccess:${name}` },
        create: { key: `cron:lastSuccess:${name}`, value },
        update: { value },
      });
    }
  } catch (err) {
    // Bookkeeping must never turn a successful cron into a failed one.
    logger.error("Failed to record cron run", { stage: "sweep", cron: name, message: err instanceof Error ? err.message : String(err) });
  }
}
