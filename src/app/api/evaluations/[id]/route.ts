import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processSpecificJob } from "@/lib/evaluationWorker";

export const maxDuration = 60;

async function getOwnedJob(id: string, userId: string) {
  const job = await prisma.evaluation.findUnique({ where: { id } });
  if (!job || job.userId !== userId) return null;
  return job;
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/evaluations/[id]">
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await ctx.params;

    const job = await getOwnedJob(id, userId);
    if (!job) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    const base = {
      id: job.id,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastError: job.status === "FAILED" || job.status === "QUEUED" ? job.lastError : null,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };

    if (job.status !== "SUCCEEDED") {
      return NextResponse.json(base);
    }

    return NextResponse.json({
      ...base,
      result: {
        totalMarks: job.totalMarks,
        obtainedMarks: job.obtainedMarks,
        percentage: job.percentage,
        aiFeedback: job.aiFeedback,
        marksBreakdown: job.marksBreakdown ? JSON.parse(job.marksBreakdown) : null,
        strengths: job.strengths ? JSON.parse(job.strengths) : [],
        weaknesses: job.weaknesses ? JSON.parse(job.weaknesses) : [],
        recommendations: job.recommendations ? JSON.parse(job.recommendations) : [],
      },
    });
  } catch (error) {
    console.error("Evaluation status fetch error:", error);
    return NextResponse.json({ error: "Couldn't check that evaluation's status. Try again." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/evaluations/[id]">
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await ctx.params;

    const job = await getOwnedJob(id, userId);
    if (!job) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    const { action } = await request.json();

    if (action === "cancel") {
      if (job.status !== "QUEUED") {
        return NextResponse.json(
          { error: job.status === "PROCESSING" ? "This evaluation is already running and can't be cancelled." : "This evaluation has already finished." },
          { status: 409 }
        );
      }
      const updated = await prisma.evaluation.update({
        where: { id },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
      return NextResponse.json({ status: updated.status });
    }

    if (action === "retry") {
      if (job.status !== "FAILED") {
        return NextResponse.json(
          { error: "Only an evaluation that has failed can be retried." },
          { status: 409 }
        );
      }
      const updated = await prisma.evaluation.update({
        where: { id },
        data: {
          status: "QUEUED",
          attempts: 0,
          nextAttemptAt: null,
          startedAt: null,
          finishedAt: null,
        },
      });
      after(async () => {
        try {
          await processSpecificJob(updated.id);
        } catch (err) {
          console.error(`Background worker trigger failed on retry for job ${updated.id}:`, err);
        }
      });
      return NextResponse.json({ status: updated.status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Evaluation action error:", error);
    return NextResponse.json({ error: "Couldn't update that evaluation. Try again." }, { status: 500 });
  }
}
