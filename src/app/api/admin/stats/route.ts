import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { reportApiError } from "@/lib/apiError";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    // 1. Gather Basic Counts
    const totalUsers = await prisma.user.count();
    const totalEvaluations = await prisma.evaluation.count();
    const totalQuestionPapers = await prisma.questionPaper.count();
    const totalReports = await prisma.savedReport.count();

    // Logins today approximation (e.g. from audit logs or dynamic active sessions)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const loginsToday = await prisma.auditLog.count({
      where: {
        action: "ADMIN_LOGIN",
        createdAt: { gte: today },
      },
    }) + await prisma.user.count({
      // approximation fallback using createdAt today
      where: { createdAt: { gte: today } }
    });

    const activeSessionsCount = await prisma.session.count();

    // 2. Average Evaluation Duration — only from rows with real startedAt/
    // finishedAt timestamps (set once by the job processor). createdAt/
    // updatedAt are NOT safe here: updatedAt is bumped by any later write to
    // the row (e.g. a saved-report rename), which previously produced
    // multi-day "average" times from unrelated edits. No fabricated fallback
    // number either — null means "not enough data yet", shown as such.
    const completedEvals = await prisma.evaluation.findMany({
      where: { status: "SUCCEEDED" },
      select: { startedAt: true, finishedAt: true, percentage: true, subject: true },
    });

    const timedEvals = completedEvals.filter((ev) => ev.startedAt && ev.finishedAt);
    let avgEvalTime: number | null = null;
    if (timedEvals.length > 0) {
      const totalDur = timedEvals.reduce((sum, ev) => {
        return sum + (ev.finishedAt!.getTime() - ev.startedAt!.getTime());
      }, 0);
      avgEvalTime = Math.round(totalDur / timedEvals.length / 1000);
    }

    // 3. Database Size check (MySQL informational query)
    let dbSizeMB = 1.2; // default fallback
    try {
      const sizeResult = await prisma.$queryRawUnsafe<Array<{ size: number | string }>>(
        "SELECT SUM(data_length + index_length) / 1024 / 1024 AS size FROM information_schema.TABLES WHERE table_schema = DATABASE()"
      );
      if (sizeResult && sizeResult[0]?.size) {
        dbSizeMB = parseFloat(parseFloat(String(sizeResult[0].size)).toFixed(2));
      }
    } catch {}

    // 4. API Success & Error Rates (approximation using error logs and audit logs)
    const errorLogsCount = await prisma.errorLog.count();
    const auditLogsCount = await prisma.auditLog.count();
    const totalTransactions = errorLogsCount + auditLogsCount + totalEvaluations;

    const errorRate = totalTransactions > 0 ? parseFloat(((errorLogsCount / totalTransactions) * 100).toFixed(1)) : 0;
    const successRate = 100 - errorRate;

    // 5. Subject Popularity Map
    const subjectCounts = new Map<string, number>();
    completedEvals.forEach((ev) => {
      subjectCounts.set(ev.subject, (subjectCounts.get(ev.subject) || 0) + 1);
    });
    const subjectPopularity = Array.from(subjectCounts.entries())
      .map(([subject, count]) => ({ name: subject, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 6. Evaluations Per Day (last 7 days)
    const evalsPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const count = await prisma.evaluation.count({
        where: {
          createdAt: { gte: d, lt: nextD },
        },
      });

      evalsPerDay.push({
        date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        evaluations: count,
      });
    }

    // 7. New Users Over Time (last 7 days)
    const usersOverTime = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const count = await prisma.user.count({
        where: {
          createdAt: { gte: d, lt: nextD },
        },
      });

      usersOverTime.push({
        date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        users: count,
      });
    }

    // 8. AI Gemini request load today
    const aiRequestsToday = await prisma.evaluation.count({
      where: {
        createdAt: { gte: today },
      },
    }) + await prisma.questionPaper.count({
      where: {
        createdAt: { gte: today },
      },
    });

    return NextResponse.json({
      overview: {
        totalUsers,
        totalEvaluations,
        totalQuestionPapers,
        totalReports,
        activeSessionsCount,
        loginsToday,
        aiRequestsToday,
        avgEvalTime,
        dbSizeMB,
        errorRate,
        successRate,
      },
      charts: {
        evalsPerDay,
        usersOverTime,
        subjectPopularity,
      },
    });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "GET /api/admin/stats" });
  }
}
