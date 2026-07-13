import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch {
    return NextResponse.json({ error: "Failed to load evaluations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete evaluation" }, { status: 500 });
  }
}
