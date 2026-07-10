import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const evaluations = await prisma.evaluation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Calculate analytics
    const completed = evaluations.filter((e) => e.status === "COMPLETED");
    const avgPercentage =
      completed.length > 0
        ? completed.reduce((sum: number, e) => sum + (e.percentage || 0), 0) / completed.length
        : 0;

    // Group by month for trend data
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const month = date.toLocaleString("default", { month: "short" });
      const monthEvals = completed.filter((e) => {
        const evalDate = new Date(e.createdAt);
        return (
          evalDate.getMonth() === date.getMonth() &&
          evalDate.getFullYear() === date.getFullYear()
        );
      });
      const avgScore =
        monthEvals.length > 0
          ? Math.round(
            monthEvals.reduce((sum: number, e) => sum + (e.percentage || 0), 0) /
            monthEvals.length
          )
          : 0;
      return { month, score: avgScore, count: monthEvals.length };
    });

    // Subject performance
    const subjectMap = new Map<string, { total: number; sum: number }>();
    completed.forEach((e) => {
      const existing = subjectMap.get(e.subject);
      if (existing) {
        existing.total += 1;
        existing.sum += e.percentage || 0;
      } else {
        subjectMap.set(e.subject, { total: 1, sum: e.percentage || 0 });
      }
    });

    const subjectPerformance = Array.from(subjectMap.entries()).map(
      ([subject, data]) => ({
        subject,
        avgScore: Math.round(data.sum / data.total),
        count: data.total,
      })
    );

    return NextResponse.json({
      totalEvaluations: evaluations.length,
      completedEvaluations: completed.length,
      avgPercentage: Math.round(avgPercentage),
      monthlyTrend: monthlyData,
      subjectPerformance,
      recentEvaluations: evaluations.slice(0, 5).map((e) => ({
        id: e.id,
        subject: e.subject,
        grade: e.grade,
        percentage: e.percentage,
        obtainedMarks: e.obtainedMarks,
        totalMarks: e.totalMarks,
        status: e.status,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
