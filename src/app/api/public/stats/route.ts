import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    
    const completedEvaluations = await prisma.evaluation.findMany({
      // modelId: { not: null } is defense in depth — a real grading call
      // always sets it alongside status SUCCEEDED (evaluationWorker.ts).
      // This database had stale rows shaped exactly like a SUCCEEDED
      // evaluation with modelId null, left by a client-side mock deleted
      // from source months ago; this public, unauthenticated figure must
      // never be able to include rows like that again.
      where: { status: "SUCCEEDED", modelId: { not: null } },
      select: { createdAt: true, updatedAt: true, startedAt: true, finishedAt: true, percentage: true }
    });

    const totalEvaluations = completedEvaluations.length;

    // Average evaluation time, computed only from rows with real startedAt/finishedAt
    // timestamps (set once by the job processor) — createdAt/updatedAt are NOT safe to
    // use here, since updatedAt is bumped by any later write to the row (e.g. a saved-report
    // rename), which previously produced multi-day "average" times from unrelated edits.
    // Also require a minimum sample size, same as the other public stats below, so a
    // handful of early rows can't produce a misleading published average.
    const timedEvaluations = completedEvaluations.filter((ev) => ev.startedAt && ev.finishedAt);
    let averageTimeSeconds: number | null = null;
    if (timedEvaluations.length >= 100) {
      const totalDurationMs = timedEvaluations.reduce((sum, ev) => {
        const duration = ev.finishedAt!.getTime() - ev.startedAt!.getTime();
        return sum + Math.max(0, duration);
      }, 0);
      averageTimeSeconds = Math.round(totalDurationMs / timedEvaluations.length / 1000);
    }

    // Calculate actual average score from real rows only
    let averagePercentage: number | null = null;
    if (totalEvaluations > 0) {
      const sumPercentage = completedEvaluations.reduce((sum, ev) => sum + (ev.percentage || 0), 0);
      averagePercentage = Math.round(sumPercentage / totalEvaluations);
    }

    // Backs the "responds within N hours" claim on contact/faq/help — that
    // used to be a flat, unmeasured "24 hours" promise with nothing in the
    // code computing or checking it. Same standard as the homepage's
    // accuracy figure: a real measurement, gated on a minimum sample size
    // so a handful of early tickets can't produce a misleading published
    // average, and null (shown as nothing, not a guess) until there's
    // enough real data.
    const repliedTickets = await prisma.supportTicket.findMany({
      select: {
        createdAt: true,
        replies: { where: { senderType: "ADMIN" }, orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
      },
      where: { replies: { some: { senderType: "ADMIN" } } },
    });
    let avgSupportResponseHours: number | null = null;
    if (repliedTickets.length >= 10) {
      const totalMs = repliedTickets.reduce((sum, t) => {
        const firstReply = t.replies[0];
        return firstReply ? sum + Math.max(0, firstReply.createdAt.getTime() - t.createdAt.getTime()) : sum;
      }, 0);
      avgSupportResponseHours = Math.round((totalMs / repliedTickets.length / (1000 * 60 * 60)) * 10) / 10;
    }

    return NextResponse.json({
      totalUsers,
      totalEvaluations,
      averageTimeSeconds,
      averagePercentage,
      avgSupportResponseHours
    });
  } catch (error) {
    console.error("Public stats API error:", error);
    return NextResponse.json({
      totalUsers: 0,
      totalEvaluations: 0,
      averageTimeSeconds: null,
      averagePercentage: null,
      avgSupportResponseHours: null
    });
  }
}
