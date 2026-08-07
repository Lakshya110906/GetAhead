import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportApiError } from "@/lib/apiError";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/reports/[id]">
) {
  let userId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    userId = (session.user as { id: string }).id;

    const evaluation = await prisma.evaluation.findFirst({
      where: { id, userId },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Same guard as GET /api/evaluations/[id]: a real grading call always
    // sets modelId/promptVersion in the same write as status SUCCEEDED (see
    // evaluationWorker.ts) — this is the route the report PAGE actually
    // calls, so this is exactly where a corrupt/stale row (found and purged
    // from this database: status SUCCEEDED/COMPLETED with modelId null, left
    // by a client-side mock deleted from source months ago) would have been
    // rendered as a fabricated report if nothing here checked for it.
    if (evaluation.status !== "SUCCEEDED" || !evaluation.modelId || !evaluation.promptVersion) {
      return NextResponse.json({ error: "This evaluation has no valid, completed report to display.", status: evaluation.status }, { status: 409 });
    }

    const parsedAiResponse = evaluation.aiResponse ? JSON.parse(evaluation.aiResponse) : null;

    return NextResponse.json({
      ...evaluation,
      aiResponse: parsedAiResponse,
      marksBreakdown: evaluation.marksBreakdown ? JSON.parse(evaluation.marksBreakdown) : null,
      questionGrades: parsedAiResponse?.questionGrades ?? null,
      unreadableQuestions: parsedAiResponse?.unreadableQuestions ?? [],
      subjectMismatch: parsedAiResponse?.subjectMismatch ?? null,
      gradeMismatch: parsedAiResponse?.gradeMismatch ?? null,
      strengths: evaluation.strengths ? JSON.parse(evaluation.strengths) : [],
      weaknesses: evaluation.weaknesses ? JSON.parse(evaluation.weaknesses) : [],
      recommendations: evaluation.recommendations
        ? JSON.parse(evaluation.recommendations)
        : [],
    });
  } catch (error) {
    return reportApiError({ code: "REPORT_FETCH_FAILED", error, route: "GET /api/reports/[id]", userId });
  }
}
