import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { evaluationId, name } = await request.json();
    if (!evaluationId) {
      return NextResponse.json({ error: "Evaluation ID is required" }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;

    // Check if already saved
    const existing = await prisma.savedReport.findFirst({
      where: { userId, evaluationId }
    });

    if (existing) {
      // Unsave it
      await prisma.savedReport.delete({
        where: { id: existing.id }
      });
      return NextResponse.json({ success: true, saved: false });
    } else {
      // Save it
      await prisma.savedReport.create({
        data: {
          userId,
          evaluationId,
          name: name || "Saved Evaluation Report"
        }
      });
      return NextResponse.json({ success: true, saved: true });
    }
  } catch (error) {
    console.error("Save report error:", error);
    return NextResponse.json({ error: "Failed to toggle save state" }, { status: 500 });
  }
}

// GET to list saved reports or check save status for a single evaluation
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const url = new URL(request.url);
  const evaluationId = url.searchParams.get("evaluationId");

  try {
    if (evaluationId) {
      const saved = await prisma.savedReport.findFirst({
        where: { userId, evaluationId }
      });
      return NextResponse.json({ success: true, saved: !!saved });
    }

    const savedReports = await prisma.savedReport.findMany({
      where: { userId },
      include: {
        evaluation: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ success: true, savedReports });
  } catch (error) {
    console.error("Get saved reports error:", error);
    return NextResponse.json({ error: "Failed to fetch saved reports" }, { status: 500 });
  }
}
