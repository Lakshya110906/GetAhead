import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    if (paper.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized access to resource" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      paper
    });
  } catch (error) {
    console.error("API get individual question paper error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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

    if (paper.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized access to resource" }, { status: 403 });
    }

    await prisma.questionPaper.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Question paper deleted successfully"
    });
  } catch (error) {
    console.error("API delete individual question paper error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
    const body = await request.json();
    const { title, content } = body;

    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    });

    if (!paper) {
      return NextResponse.json({ error: "Question paper not found" }, { status: 404 });
    }

    if (paper.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized access to resource" }, { status: 403 });
    }

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
    console.error("API update individual question paper error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

