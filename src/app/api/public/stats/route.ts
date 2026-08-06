import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    
    const completedEvaluations = await prisma.evaluation.findMany({
      where: { status: "SUCCEEDED" },
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

    return NextResponse.json({
      totalUsers,
      totalEvaluations,
      averageTimeSeconds,
      averagePercentage
    });
  } catch (error) {
    console.error("Public stats API error:", error);
    return NextResponse.json({
      totalUsers: 0,
      totalEvaluations: 0,
      averageTimeSeconds: null,
      averagePercentage: null
    });
  }
}
