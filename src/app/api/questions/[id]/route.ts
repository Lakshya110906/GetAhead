import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireOwnership } from "@/lib/ownership";
import { reportApiError } from "@/lib/apiError";
import { zodErrorResponse } from "@/lib/zodError";

const updateQuestionPaperSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/questions/[id]">
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const userId = (session.user as { id: string }).id;

    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    });

    if (!paper) {
      return NextResponse.json({ error: "Question paper not found" }, { status: 404 });
    }

    const denied = requireOwnership(paper.userId === userId, "Question paper not found");
    if (denied) return denied;

    return NextResponse.json({
      success: true,
      paper
    });
  } catch (error) {
    return reportApiError({ code: "QUESTION_PAPER_FETCH_FAILED", error, route: "GET /api/questions/[id]" });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/questions/[id]">
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const userId = (session.user as { id: string }).id;

    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    });

    if (!paper) {
      return NextResponse.json({ error: "Question paper not found" }, { status: 404 });
    }

    const denied = requireOwnership(paper.userId === userId, "Question paper not found");
    if (denied) return denied;

    await prisma.questionPaper.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Question paper deleted successfully"
    });
  } catch (error) {
    return reportApiError({ code: "QUESTION_PAPER_DELETE_FAILED", error, route: "DELETE /api/questions/[id]" });
  }
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/questions/[id]">
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const userId = (session.user as { id: string }).id;

    const parsed = updateQuestionPaperSchema.safeParse(await request.json());
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }
    const { title, content } = parsed.data;

    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    });

    if (!paper) {
      return NextResponse.json({ error: "Question paper not found" }, { status: 404 });
    }

    const denied = requireOwnership(paper.userId === userId, "Question paper not found");
    if (denied) return denied;

    const updated = await prisma.questionPaper.update({
      where: { id },
      data: {
        title: title || paper.title,
        content: content || paper.content
      }
    });

    return NextResponse.json({
      success: true,
      paper: updated
    });
  } catch (error) {
    return reportApiError({ code: "QUESTION_PAPER_UPDATE_FAILED", error, route: "PUT /api/questions/[id]" });
  }
}
