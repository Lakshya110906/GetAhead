import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    
    const completedEvaluations = await prisma.evaluation.findMany({
      where: { status: "SUCCEEDED" },
      select: { createdAt: true, updatedAt: true, percentage: true }
    });

    const totalEvaluations = completedEvaluations.length;

    // Calculate actual average evaluation time in seconds from real rows only
    let averageTimeSeconds: number | null = null;
    if (totalEvaluations > 0) {
      const totalDurationMs = completedEvaluations.reduce((sum, ev) => {
        const duration = ev.updatedAt.getTime() - ev.createdAt.getTime();
        return sum + Math.max(0, duration);
      }, 0);
      averageTimeSeconds = Math.round(totalDurationMs / totalEvaluations / 1000);
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
