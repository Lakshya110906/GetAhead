import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processJobStep } from "@/lib/paperJob";
import { reportApiError } from "@/lib/apiError";

// A real Gemini call lives here, and only here — this is the fix for a
// live, confirmed production bug: GET /api/papers/[id] used to call
// processJobStep() inline ("the poll doubles as the driver"), which meant
// every poll was a real, awaited model call racing that route's own
// maxDuration. Confirmed in production logs: "[TIMING] Planner Agent
// attempt 1: 8.40s" immediately followed by "Task timed out after 15
// seconds" — 504 — on the poll itself. That was the exact same mistake
// already fixed once on POST /api/papers, just relocated to GET.
//
// The split: GET is now a pure, fast read (see that file) with a low
// maxDuration it can actually guarantee. This route does the one-step-at-a-
// time advancement and gets a generous maxDuration of its own, called by
// the client as a separate, NOT-awaited-for-UI-purposes request alongside
// each read poll — a slow or even timed-out advance call here never blocks
// the read from returning current state.
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const route = "POST /api/papers/[id]/advance";
  let userId: string | undefined;
  let id: string | undefined;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = (session.user as { id: string }).id;
    ({ id } = await params);

    const existing = await prisma.paperGenerationJob.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (existing.status === "queued" || existing.status === "running") {
      await processJobStep(id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return reportApiError({ code: "GEN_STEP_FAILED", error, route, userId, extra: { jobId: id } });
  }
}
