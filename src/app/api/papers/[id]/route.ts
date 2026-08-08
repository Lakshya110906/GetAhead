import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobView } from "@/lib/paperJob";
import { reportApiError } from "@/lib/apiError";

// PREVIOUS BUG (confirmed live in production — "[TIMING] Planner Agent
// attempt 1: 8.40s" immediately followed by "Task timed out after 15
// seconds", 504, on this exact route): this GET handler used to call
// processJobStep() inline ("doubles as the driver, not just a read"). That
// meant every poll was a real, awaited Gemini call racing this route's own
// maxDuration — the identical mistake already fixed once on POST
// /api/papers, just relocated here. Fixed by making this a pure read: it
// never advances the job itself. Advancement now happens in
// POST /api/papers/[id]/advance (its own, more generous maxDuration),
// triggered by the client as a separate, not-blocking-the-UI request
// alongside each read poll — see generate-paper/page.tsx.
export const maxDuration = 15;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const route = "GET /api/papers/[id]";
  let userId: string | undefined;
  let id: string | undefined;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = (session.user as { id: string }).id;
    ({ id } = await params);

    const view = await getJobView(id, userId);
    if (!view) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Persist the finished paper into the existing QuestionPaper table exactly
    // once, the first time a poll observes "succeeded" — keeps saved-reports
    // and the rest of the app working against the same table as before; the
    // job row itself is just the in-flight scaffolding.
    if (view.status === "succeeded" && view.paper && !view.savedPaperId) {
      const row = await prisma.paperGenerationJob.findUnique({ where: { id } });
      const config = JSON.parse(row!.config);
      const dbPayload = {
        paper: view.paper,
        plannerPlan: JSON.parse(row!.plannerPlan || "{}"),
        generatorDraft: JSON.parse(row!.draftPaper || "{}"),
        metadata: {
          institutionName: "",
          courseCode: "",
          timeAllowed: view.paper.timeAllowed,
          instructions: "",
        },
      };
      const saved = await prisma.questionPaper.create({
        data: {
          userId,
          subject: config.subject,
          grade: config.grade,
          difficulty: config.difficulty,
          totalMarks: view.paper.totalMarks,
          title: view.paper.title,
          content: JSON.stringify(dbPayload),
        },
      });
      await prisma.paperGenerationJob.update({ where: { id }, data: { savedPaperId: saved.id } });
      view.savedPaperId = saved.id;
    }

    return NextResponse.json(view);
  } catch (error) {
    return reportApiError({ code: "GEN_POLL_FAILED", error, route, userId, extra: { jobId: id } });
  }
}

// Cancel: sets status to "cancelled" so processJobStep()'s terminal-status
// check short-circuits on the very next call (including one already
// in-flight from a concurrent poll — it will finish its current single step,
// persist, then the NEXT call sees "cancelled" and stops, rather than being
// forcibly killed mid-write, which could corrupt the row).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const route = "DELETE /api/papers/[id]";
  let userId: string | undefined;
  let id: string | undefined;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = (session.user as { id: string }).id;
    ({ id } = await params);

    const existing = await prisma.paperGenerationJob.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (existing.status === "succeeded" || existing.status === "failed" || existing.status === "cancelled") {
      return NextResponse.json({ error: `Job already ${existing.status}, cannot cancel` }, { status: 409 });
    }

    await prisma.paperGenerationJob.update({ where: { id }, data: { status: "cancelled", lockedAt: null } });
    return NextResponse.json({ status: "cancelled" });
  } catch (error) {
    return reportApiError({ code: "GEN_CANCEL_FAILED", error, route, userId, extra: { jobId: id } });
  }
}
