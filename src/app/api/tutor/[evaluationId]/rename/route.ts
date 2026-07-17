import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ evaluationId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { evaluationId } = await params;

    const body = await req.json();
    const title = body.title?.trim();
    if (!title || title.length > 100) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }

    // Verify ownership
    const conversation = await prisma.tutorConversation.findUnique({
      where: { evaluationId },
      select: { id: true, userId: true },
    });
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.tutorConversation.update({
      where: { id: conversation.id },
      data: { title },
      select: { id: true, title: true },
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    console.error("Tutor rename error:", error);
    return NextResponse.json({ error: "Failed to rename" }, { status: 500 });
  }
}
