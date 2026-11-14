import { NextRequest, NextResponse, after } from "next/server";
import { processOneDuePaperJob } from "@/lib/paperJob";
import { logger } from "@/lib/logger";

// Steps run in after(), inside this invocation, so they get this budget.
export const maxDuration = 300;

// Safety net for the paper-generation job pipeline. The common path is the
// client's /advance call alongside every progress poll; this sweep exists
// for the case that isn't covered — the user closed the tab, or the browser
// never polled again — so a job doesn't sit "running" forever with a dead
// worker's stale lock. Runs once a day from vercel.json (Hobby limit).
//
// Same fix as sweep-evaluations: this used to await up to five Gemini agent
// steps inline under a 60s cap. Steps take 17s on average and up to 53s
// (GeminiCallLog), so a sweep with more than one due job timed out — and
// because this cron is only in vercel.json, not the GitHub workflow, those
// failures emailed nobody. Now it responds immediately and advances jobs in
// after(), stopping before it would start a step it can't finish.
const BATCH_SIZE = 5;
const BUDGET_MS = (maxDuration - 10) * 1000;
// Longest step observed is ~53s; don't start one with less than this left.
const MIN_STEP_HEADROOM_MS = 90_000;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset — fail closed, do not allow unauthenticated cron calls
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  after(async () => {
    let processed = 0;
    for (let i = 0; i < BATCH_SIZE; i++) {
      if (BUDGET_MS - (Date.now() - startedAt) < MIN_STEP_HEADROOM_MS) break;
      try {
        const didWork = await processOneDuePaperJob();
        if (!didWork) break;
        processed++;
      } catch (err) {
        logger.error("Paper sweep step crashed", {
          stage: "sweep",
          message: err instanceof Error ? err.message : String(err),
        });
        break;
      }
    }
    logger.info("Paper job sweep ran", { stage: "sweep", processed });
  });

  return NextResponse.json({ ok: true, scheduled: true });
}
