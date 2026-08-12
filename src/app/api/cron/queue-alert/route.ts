import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { alertOncePerDay } from "@/lib/alerts";
import { logger } from "@/lib/logger";

// A growing queue is how you find out the worker died before a user tells
// you — this cron is the check for exactly that. Threshold and cadence are
// intentionally conservative defaults; tune QUEUE_DEPTH_ALERT_THRESHOLD to
// whatever "clearly not draining" means at your actual traffic volume.
const QUEUE_DEPTH_ALERT_THRESHOLD = Number(process.env.QUEUE_DEPTH_ALERT_THRESHOLD || 20);

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset — fail closed, do not allow unauthenticated cron calls
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queueDepth = await prisma.evaluation.count({ where: { status: { in: ["QUEUED", "PROCESSING"] } } });
  logger.info("Queue depth check", { stage: "sweep", queueDepth, threshold: QUEUE_DEPTH_ALERT_THRESHOLD });

  if (queueDepth > QUEUE_DEPTH_ALERT_THRESHOLD) {
    await alertOncePerDay(
      "queue-depth-alert",
      "QUEUE_DEPTH_ALERT",
      `Evaluation queue depth is ${queueDepth}, above the ${QUEUE_DEPTH_ALERT_THRESHOLD} threshold — the worker may be stuck or behind. Check /admin (Metrics tab) and the sweep cron.`
    );
  }

  return NextResponse.json({ ok: true, queueDepth, threshold: QUEUE_DEPTH_ALERT_THRESHOLD });
}
