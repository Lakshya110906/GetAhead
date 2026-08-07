import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobView, processJobStep } from "@/lib/paperJob";

export const maxDuration = 15;

// GET doubles as the driver, not just a read — this is what lets a job
// recover from a killed worker without a separate always-on process: every
// poll first nudges the job forward by (at most) one step if it's due
// (queued, or "running" with a lock old enough to mean the previous worker
// died mid-step), then returns the current row. A user who never comes back
// leaves the job for the daily cron sweep instead (see
// /api/cron/sweep-paper-jobs) — a weaker but real safety net given the
// Hobby plan's cron-frequency ceiling.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const existing = await prisma.paperGenerationJob.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (existing.status === "queued" || existing.status === "running") {
    try {
      await processJobStep(id);
    } catch {
      // The row's own error/status fields are authoritative; a thrown error
      // here just means this particular poll's nudge didn't land — the
      // next poll (a few seconds later) tries again.
    }
  }

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
}

// Cancel: sets status to "cancelled" so processJobStep()'s terminal-status
// check short-circuits on the very next call (including one already
// in-flight from a concurrent poll — it will finish its current single step,
// persist, then the NEXT call sees "cancelled" and stops, rather than being
// forcibly killed mid-write, which could corrupt the row).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const existing = await prisma.paperGenerationJob.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (existing.status === "succeeded" || existing.status === "failed" || existing.status === "cancelled") {
    return NextResponse.json({ error: `Job already ${existing.status}, cannot cancel` }, { status: 409 });
  }

  await prisma.paperGenerationJob.update({ where: { id }, data: { status: "cancelled", lockedAt: null } });
  return NextResponse.json({ status: "cancelled" });
}
