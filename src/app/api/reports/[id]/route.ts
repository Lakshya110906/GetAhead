import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/reports/[id]">
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const userId = (session.user as { id: string }).id;

    const evaluation = await prisma.evaluation.findFirst({
      where: { id, userId },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...evaluation,
      aiResponse: evaluation.aiResponse ? JSON.parse(evaluation.aiResponse) : null,
      marksBreakdown: evaluation.marksBreakdown
        ? JSON.parse(evaluation.marksBreakdown)
        : null,
      strengths: evaluation.strengths ? JSON.parse(evaluation.strengths) : [],
      weaknesses: evaluation.weaknesses ? JSON.parse(evaluation.weaknesses) : [],
      recommendations: evaluation.recommendations
        ? JSON.parse(evaluation.recommendations)
        : [],
    });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
