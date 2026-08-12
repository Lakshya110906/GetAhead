import { NextRequest, NextResponse } from "next/server";
import { processOneDuePaperJob } from "@/lib/paperJob";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

// Safety net for the paper-generation job pipeline — mirrors
// sweep-evaluations/route.ts exactly, same reasoning: the common path is the
// immediate step triggered inline by POST /api/papers and every subsequent
// GET /api/papers/[id] poll, which keeps a job moving within a couple of
// seconds of it being due. This sweep exists for the case that isn't
// covered — the user closed the tab, or the browser never got to poll again
// — so a job doesn't sit "running" forever with a dead worker's stale lock.
// On the Hobby plan, crons only run once a day, so a job with nobody
// watching it can wait up to 24h in the worst case; that is the honest
// limitation of this plan, not a design flaw — see the report.
const BATCH_SIZE = 5;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset — fail closed, do not allow unauthenticated cron calls
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let processed = 0;
  for (let i = 0; i < BATCH_SIZE; i++) {
    const didWork = await processOneDuePaperJob();
    if (!didWork) break;
    processed++;
  }

  logger.info("Paper job sweep cron ran", { stage: "sweep", processed });
  return NextResponse.json({ ok: true, processed });
}
