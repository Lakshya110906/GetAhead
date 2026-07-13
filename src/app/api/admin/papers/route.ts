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
  } catch {
    return NextResponse.json({ error: "Failed to load papers" }, { status: 500 });
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
      await prisma.questionPaper.delete({
        where: { id },
      });
      await prisma.auditLog.create({
        data: { action: "QUESTION_PAPER_DELETE", details: `Deleted question paper ${id}`, ip },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete question paper" }, { status: 500 });
  }
}
