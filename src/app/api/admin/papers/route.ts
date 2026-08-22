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
    const where: Prisma.QuestionPaperWhereInput = {};
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { title: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const total = await prisma.questionPaper.count({ where });
    const papers = await prisma.questionPaper.findMany({
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

    const formattedPapers = papers.map((p) => ({
      id: p.id,
      owner: p.user.name,
      ownerEmail: p.user.email,
      subject: p.subject,
      title: p.title,
      grade: p.grade,
      difficulty: p.difficulty,
      totalMarks: p.totalMarks,
      createdAt: p.createdAt,
      content: p.content,
    }));

    return NextResponse.json({ papers: formattedPapers, total, page, limit });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "GET /api/admin/papers" });
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
      await prisma.questionPaper.delete({
        where: { id },
      });
      await prisma.auditLog.create({
        data: { action: "QUESTION_PAPER_DELETE", details: `Deleted question paper ${id}`, ip },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "POST /api/admin/papers" });
  }
}
