import { prisma } from "@/lib/prisma";
import { getTodaysSpend } from "@/lib/spendControl";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const LATENCY_SAMPLE_SIZE = 500;

function percentile(sortedMs: number[], p: number): number {
  if (sortedMs.length === 0) return 0;
  const idx = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[idx];
}

/** Buckets a free-text lastError into a small, actionable set of error types. */
function classifyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("api key") || m.includes("not configured")) return "CONFIG";
  if (m.includes("download") || m.includes("storage returned")) return "FILE_DOWNLOAD";
  if (m.includes("timeout") || m.includes("timed out")) return "TIMEOUT";
  if (m.includes("json") || m.includes("parse") || m.includes("schema")) return "MODEL_OUTPUT_INVALID";
  if (m.includes("quota") || m.includes("rate limit") || m.includes("429")) return "UPSTREAM_RATE_LIMIT";
  return "OTHER";
}

export interface EvaluationMetrics {
  windowHours: number;
  enqueued: number;
  succeeded: number;
  failed: number;
  queueDepth: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencySampleSize: number;
  errorsByType: { type: string; count: number }[];
  spend: Awaited<ReturnType<typeof getTodaysSpend>>;
}

/**
 * Everything worth checking weekly, on one page. Deliberately excludes
 * anything not actionable (e.g. raw CPU/memory, which don't mean anything
 * on serverless — see /api/admin/health) — queue depth and error rate are
 * what actually tell you the pipeline is unhealthy.
 */
export async function getEvaluationMetrics(): Promise<EvaluationMetrics> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [enqueued, succeeded, failed, queueDepth, recentFailures, latencyRows, spend] = await Promise.all([
    prisma.evaluation.count({ where: { queuedAt: { gte: since } } }),
    prisma.evaluation.count({ where: { status: "SUCCEEDED", finishedAt: { gte: since } } }),
    prisma.evaluation.count({ where: { status: "FAILED", finishedAt: { gte: since } } }),
    prisma.evaluation.count({ where: { status: { in: ["QUEUED", "PROCESSING"] } } }),
    prisma.evaluation.findMany({
      where: { status: "FAILED", finishedAt: { gte: since }, lastError: { not: null } },
      select: { lastError: true },
      take: 1000,
    }),
    prisma.evaluation.findMany({
      where: { status: "SUCCEEDED", startedAt: { not: null }, finishedAt: { not: null } },
      select: { startedAt: true, finishedAt: true },
      orderBy: { finishedAt: "desc" },
      take: LATENCY_SAMPLE_SIZE,
    }),
    getTodaysSpend(),
  ]);

  const durations = latencyRows
    .map((r) => (r.finishedAt && r.startedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null))
    .filter((n): n is number => n !== null && n >= 0)
    .sort((a, b) => a - b);

  const errorCounts = new Map<string, number>();
  for (const row of recentFailures) {
    const type = classifyError(row.lastError || "");
    errorCounts.set(type, (errorCounts.get(type) || 0) + 1);
  }

  return {
    windowHours: WINDOW_MS / (60 * 60 * 1000),
    enqueued,
    succeeded,
    failed,
    queueDepth,
    latencyP50Ms: percentile(durations, 50),
    latencyP95Ms: percentile(durations, 95),
    latencySampleSize: durations.length,
    errorsByType: Array.from(errorCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    spend,
  };
}
