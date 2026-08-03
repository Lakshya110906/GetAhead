import { NextRequest, NextResponse } from "next/server";
import { processSpecificJob } from "@/lib/evaluationWorker";

export const maxDuration = 60;

// Internal-only: POST /api/evaluations fires this immediately (unawaited)
// right after enqueueing a job, so the common case gets processed within
// a second or two instead of waiting for the next cron sweep. Guarded by
// the same shared secret as the cron sweep since nothing public should be
// able to trigger arbitrary job processing.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured in this environment (e.g. local dev) — allow
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await request.json().catch(() => ({ jobId: undefined }));
  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    await processSpecificJob(jobId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Worker trigger error:", error);
    // The job row itself already records the failure; this response is just
    // telling the caller (a fire-and-forget fetch) that the attempt ran.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
