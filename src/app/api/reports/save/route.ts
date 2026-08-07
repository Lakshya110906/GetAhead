import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportApiError } from "@/lib/apiError";

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
    return reportApiError({ code: "REPORT_FETCH_FAILED", error, route: "POST /api/reports/save", userId: (session.user as { id: string }).id });
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

    // Same guard as GET /api/evaluations/[id]: a SUCCEEDED evaluation with no
    // modelId never came from a real grading call (evaluationWorker.ts always
    // sets both together) — found and purged exactly this shape of stale row
    // from the database (leftover from a client-side mock deleted from
    // source months before this check existed). Filtering here too, not just
    // at the single-report endpoint, since this list renders scores directly.
    const trustworthy = savedReports.filter(
      (r) => r.evaluation && r.evaluation.status === "SUCCEEDED" && r.evaluation.modelId
    );

    return NextResponse.json({ success: true, savedReports: trustworthy });
  } catch (error) {
    return reportApiError({ code: "REPORT_FETCH_FAILED", error, route: "GET /api/reports/save" });
  }
}
