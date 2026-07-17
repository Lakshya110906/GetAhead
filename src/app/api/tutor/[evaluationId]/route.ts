import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ evaluationId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { evaluationId } = await params;

    // Verify ownership
    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evaluationId, userId },
      select: { id: true, subject: true, grade: true, examType: true, percentage: true, obtainedMarks: true, totalMarks: true },
    });
    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    // Get or create conversation
    let conversation = await prisma.tutorConversation.findUnique({
      where: { evaluationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.tutorConversation.create({
        data: {
          userId,
          evaluationId,
          title: `${evaluation.subject} Tutor Session`,
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
      },
      messages: conversation.messages,
      evaluation,
    });
  } catch (error) {
    console.error("Tutor GET error:", error);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { evaluationId } = await params;

    // Verify ownership
    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evaluationId, userId },
      select: { id: true },
    });
    if (!evaluation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const conversation = await prisma.tutorConversation.findUnique({
      where: { evaluationId },
    });

    if (conversation && conversation.userId === userId) {
      // Delete all messages (cascade), reset conversation
      await prisma.tutorMessage.deleteMany({
        where: { conversationId: conversation.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tutor DELETE error:", error);
    return NextResponse.json({ error: "Failed to clear conversation" }, { status: 500 });
  }
}
