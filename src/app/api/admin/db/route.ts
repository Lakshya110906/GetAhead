import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { reportApiError } from "@/lib/apiError";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const userCount = await prisma.user.count();
    const evaluationCount = await prisma.evaluation.count();
    const paperCount = await prisma.questionPaper.count();
    const reportCount = await prisma.savedReport.count();
    const feedbackCount = await prisma.feedback.count();
    const sessionCount = await prisma.session.count();
    const auditCount = await prisma.auditLog.count();
    const errorCount = await prisma.errorLog.count();
    const settingsCount = await prisma.systemSetting.count();

    // Migration count from _prisma_migrations
    let migrationCount = 0;
    try {
      const migrations = await prisma.$queryRawUnsafe<Array<{ count: number | string }>>("SELECT COUNT(*) as count FROM _prisma_migrations");
      migrationCount = Number(migrations[0]?.count || 0);
    } catch {}

    const tables = [
      { name: "User", count: userCount },
      { name: "Evaluation", count: evaluationCount },
      { name: "QuestionPaper", count: paperCount },
      { name: "SavedReport", count: reportCount },
      { name: "Feedback", count: feedbackCount },
      { name: "Session", count: sessionCount },
      { name: "AuditLog", count: auditCount },
      { name: "ErrorLog", count: errorCount },
      { name: "SystemSetting", count: settingsCount },
    ];

    return NextResponse.json({
      dbName: "defaultdb (Aiven MySQL)",
      status: "CONNECTED",
      migrationCount,
      tables,
    });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "GET /api/admin/db" });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { action } = await request.json();
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    if (action === "health-check") {
      // Execute a quick simple raw query to confirm db responsiveness
      await prisma.$executeRawUnsafe("SELECT 1");
      return NextResponse.json({ success: true, message: "Database is fully responsive!" });
    }

    if (action === "export") {
      // Gather all core data tables
      const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
      const evaluations = await prisma.evaluation.findMany({ select: { id: true, subject: true, percentage: true, grade: true, createdAt: true } });
      const papers = await prisma.questionPaper.findMany({ select: { id: true, subject: true, title: true, difficulty: true, createdAt: true } });
      const savedReports = await prisma.savedReport.findMany();
      const feedbacks = await prisma.feedback.findMany();

      const dump = {
        exportedAt: new Date().toISOString(),
        users,
        evaluations,
        papers,
        savedReports,
        feedbacks,
      };

      await prisma.auditLog.create({
        data: { action: "DATABASE_EXPORT", details: "Exported database core records dump", ip },
      });

      return NextResponse.json(dump);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "POST /api/admin/db" });
  }
}
