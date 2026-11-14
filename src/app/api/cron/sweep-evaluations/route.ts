import { NextRequest, NextResponse, after } from "next/server";
import { claimNextJob, failExhaustedJobs, runJob } from "@/lib/evaluationWorker";
import { logger } from "@/lib/logger";
import { recordCronRun } from "@/lib/cronRuns";

// The grading work for claimed jobs runs in after(), inside this same
// invocation, so it gets this route's full budget. Must match
// WORKER_MAX_DURATION_S in evaluationWorker.ts (a literal is required here:
// Next.js reads maxDuration statically at build time).
export const maxDuration = 300;

// Safety net for the whole job pipeline. The common path is the immediate
// fire-and-forget trigger fired by POST /api/evaluations, which handles jobs
// within a second or two of being queued — this sweep exists for everything
// that doesn't go through that path: a dropped fire-and-forget request, a
// retry whose backoff has elapsed, or a job whose previous worker died
// mid-run (stuck in PROCESSING).
//
// This endpoint marks state; it does not make the caller wait on model
// calls. It used to run grading inline and return only when grading
// finished, under a 60s cap. A 19-page sheet's extraction alone takes
// 45-55s, so from 10 to 12 Nov 2026 every run timed out (HTTP 504) on the
// same job, which was then reclaimed 12 times because nothing enforced
// maxAttempts. Now, in the request itself: retire exhausted jobs, claim up
// to BATCH_SIZE due jobs, and return 200 in about a second. The claimed jobs
// are graded after the response, in after(), with the platform's full 300s.
//
// Idempotent under being killed at any point: a claimed row is PROCESSING
// with a fresh startedAt, so if this invocation dies mid-grading the row
// goes stale and the next sweep reclaims it — resuming from the extraction
// checkpoint if stage 1 had finished — until its attempts run out, at which
// point failExhaustedJobs() retires it with a refund.
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

  const retired = await failExhaustedJobs();

  const claimed: string[] = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const id = await claimNextJob();
    if (!id) break;
    claimed.push(id);
  }

  // Always scheduled, even with nothing claimed, so the run is recorded
  // (cronRuns.ts) only after its background work has actually finished.
  after(async () => {
    // Sequential, not parallel: each job makes Gemini calls against one
    // shared daily ceiling, and the connection pool is small.
    let crashed = 0;
    for (const id of claimed) {
      try {
        await runJob(id);
      } catch (err) {
        // runJob records its own failures on the row; this only catches
        // something escaping it, so one bad job can't strand the next.
        crashed++;
        logger.error("Sweep background job crashed", {
          stage: "sweep",
          jobId: id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    await recordCronRun("sweep-evaluations", crashed === 0, { retired, claimed: claimed.length, crashed });
  });

  logger.info("Sweep cron ran", { stage: "sweep", retired, claimed: claimed.length });
  return NextResponse.json({ ok: true, retired, claimed: claimed.length });
}
