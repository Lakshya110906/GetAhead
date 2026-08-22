import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { reportApiError } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  try {
    const where: Prisma.EvaluationWhereInput = {};
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const total = await prisma.evaluation.count({ where });
    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const formattedEvaluations = evaluations.map((e) => ({
      id: e.id,
      owner: e.user.name,
      ownerEmail: e.user.email,
      subject: e.subject,
      grade: e.grade,
      score: e.obtainedMarks !== null && e.totalMarks !== null ? `${e.obtainedMarks}/${e.totalMarks}` : "N/A",
      createdAt: e.createdAt,
      duration: Math.round((e.updatedAt.getTime() - e.createdAt.getTime()) / 1000),
    }));

    return NextResponse.json({ evaluations: formattedEvaluations, total, page, limit });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "GET /api/admin/evaluations" });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { action, id } = await request.json();
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    if (action === "delete") {
      await prisma.evaluation.delete({
        where: { id },
      });
      await prisma.auditLog.create({
        data: { action: "EVALUATION_DELETE", details: `Deleted evaluation ${id}`, ip },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "POST /api/admin/evaluations" });
  }
}
