import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { alertOncePerDay, isAlertEmailConfigured } from "@/lib/alerts";
import { STALE_PROCESSING_MS, ATTEMPTS_EXHAUSTED_MESSAGE } from "@/lib/evaluationWorker";
import { recordCronRun } from "@/lib/cronRuns";
import { logger } from "@/lib/logger";

// Answers "is anything stuck right now?" — and says so loudly.
//
// It used to alert only when more than 20 evaluations were QUEUED or
// PROCESSING. This app has had 9 evaluations in total, so that could never
// fire, and depth isn't the failure that happens here anyway: in the
// 10-12 Nov 2026 incident two jobs were stuck — depth 2 — while the sweep
// returned 504 for three days. A stuck job is the signal:
//   - an evaluation PROCESSING past the worker's own stale threshold
//     (the same STALE_PROCESSING_MS the sweep uses to decide it's dead);
//   - an evaluation still QUEUED well after the post-upload trigger should
//     have taken it (it normally starts within seconds);
//   - a paper job still queued/running with no update for a long time.
//
// Delivery: the response carries `stuck`, and the GitHub workflow step fails
// when it's non-zero — GitHub's failure email is the one paging channel this
// project has proven works. The email in alerts.ts only works if
// RESEND_API_KEY is set, and production doesn't have it; the response
// reports that rather than pretending an email went out.

const QUEUED_OVERDUE_MS = 15 * 60 * 1000;
const PAPER_STALLED_MS = 30 * 60 * 1000;
const parsedDepthThreshold = Number(process.env.QUEUE_DEPTH_ALERT_THRESHOLD);
const QUEUE_DEPTH_ALERT_THRESHOLD = Number.isFinite(parsedDepthThreshold) && parsedDepthThreshold > 0 ? parsedDepthThreshold : 20;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset — fail closed, do not allow unauthenticated cron calls
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const [queueDepth, stuckProcessing, overdueQueued, stalledPapers, retiredLast24h] = await Promise.all([
    prisma.evaluation.count({ where: { status: { in: ["QUEUED", "PROCESSING"] } } }),
    prisma.evaluation.count({ where: { status: "PROCESSING", startedAt: { lt: new Date(now - STALE_PROCESSING_MS) } } }),
    prisma.evaluation.count({ where: { status: "QUEUED", queuedAt: { lt: new Date(now - QUEUED_OVERDUE_MS) } } }),
    prisma.paperGenerationJob.count({
      where: { status: { in: ["queued", "running"] }, updatedAt: { lt: new Date(now - PAPER_STALLED_MS) } },
    }),
    prisma.evaluation.count({
      where: { status: "FAILED", lastError: ATTEMPTS_EXHAUSTED_MESSAGE, finishedAt: { gte: new Date(now - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const stuck = stuckProcessing + overdueQueued + stalledPapers;
  const detail = { stuckProcessing, overdueQueued, stalledPapers, retiredLast24h, queueDepth, threshold: QUEUE_DEPTH_ALERT_THRESHOLD };
  logger.info("Queue health check", { stage: "sweep", stuck, ...detail });

  const alerting = stuck > 0 || queueDepth > QUEUE_DEPTH_ALERT_THRESHOLD;
  if (alerting) {
    await alertOncePerDay(
      "queue-stuck-alert",
      "QUEUE_STUCK_ALERT",
      `Stuck work detected: ${stuckProcessing} evaluation(s) PROCESSING past the stale threshold, ` +
        `${overdueQueued} evaluation(s) QUEUED for over 15 minutes, ${stalledPapers} paper job(s) with no progress for 30 minutes. ` +
        `Queue depth ${queueDepth}. ${retiredLast24h} evaluation(s) retired after exhausting attempts in the last 24h. Check /admin and the sweep cron.`
    );
  }

  await recordCronRun("queue-alert", true, { stuck, ...detail });
  return NextResponse.json({ ok: true, stuck, alerting, emailConfigured: isAlertEmailConfigured(), ...detail });
}
