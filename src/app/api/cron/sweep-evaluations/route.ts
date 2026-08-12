import { NextRequest, NextResponse } from "next/server";
import { processOneDueJob } from "@/lib/evaluationWorker";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

// Safety net for the whole job pipeline. The common path is the immediate
// fire-and-forget trigger fired by POST /api/evaluations, which handles jobs
// within a second or two of being queued — this sweep exists for everything
// that doesn't go through that path: a dropped fire-and-forget request, a
// retry whose backoff has elapsed, or a job whose previous worker died
// mid-run (stuck in PROCESSING). Register this on a Vercel Cron schedule
// (see vercel.json); on the Hobby plan crons only run once a day, so the
// immediate trigger — not this sweep — is what keeps latency low in practice.
//
// Grading is two sequential model calls (extract, then grade — see
// answerSheetGrading.ts), so a single job can take longer than a single
// call would. Batch size is kept small relative to maxDuration=60 so the
// loop can't itself time out mid-job on a multi-page submission.
const BATCH_SIZE = 2;

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
    const didWork = await processOneDueJob();
    if (!didWork) break;
    processed++;
  }

  logger.info("Sweep cron ran", { stage: "sweep", processed });
  return NextResponse.json({ ok: true, processed });
}
