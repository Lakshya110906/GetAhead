import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeQuota, QuotaExceededError } from "@/lib/quota";
import { assertSpendGateOpen, SpendLimitReachedError } from "@/lib/spendControl";
import { parseCustomInstructions, checkForConflict } from "@/lib/paperConstraintParser";
import { initialAgentStates } from "@/lib/paperJob";
import { reportApiError } from "@/lib/apiError";
import type { PaperConfig } from "@/lib/question-agents";

// Deliberately small — this route only validates input, resolves conflicts,
// and writes a "queued" row; it must never do real Gemini work itself.
//
// PREVIOUS BUG (confirmed live in production — "Vercel Runtime Timeout Error:
// Task timed out after 15 seconds" on this exact route, repeatedly): this
// route used to await processJobStep() inline "to feel instant," reasoning
// from one measured 9.09s planner call. That was never a safe margin — a
// real run measured at 9.47s planner time plus overhead totaled 11.8s
// locally, with no serverless cold-start penalty and no production network
// variance included. Any of those pushed it past 15s, and the ENTIRE
// request — including the job-row-created response the client needed —
// died with the platform killing the function mid-await. Fixed by never
// awaiting a Gemini call here at all: the job row is created and returned
// immediately, and the client's own first poll (fired synchronously right
// after this response, see generate-paper/page.tsx) is what triggers step
// one — GET /api/papers/[id] already drives the job forward on every poll.
// This route is now just a fast DB write; 15s remains generous headroom for
// that, not close to becoming a bottleneck.
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const route = "POST /api/papers";
  let userId: string | undefined;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = (session.user as { id: string }).id;

    try {
      await assertSpendGateOpen();
    } catch (err) {
      if (err instanceof SpendLimitReachedError) {
        return NextResponse.json({ error: err.message, maintenance: true }, { status: 503 });
      }
      throw err;
    }

    const body = await request.json();
    const {
      subject, grade, topic, difficulty, totalMarks, questionTypes,
      customPrompt, studyMaterialText, conflictResolution,
    } = body;

    if (!subject || !grade || !topic || !difficulty || !totalMarks || !questionTypes || !Array.isArray(questionTypes)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const parsedTotalMarks = parseInt(totalMarks);
    if (isNaN(parsedTotalMarks)) {
      return NextResponse.json({ error: "Invalid total marks" }, { status: 400 });
    }

    const parsedConstraints = parseCustomInstructions(customPrompt);
    let effectiveTotalMarks = parsedTotalMarks;
    let effectiveQuestionTypes: string[] = questionTypes;

    if (!conflictResolution) {
      const conflict = checkForConflict(parsedConstraints, parsedTotalMarks, questionTypes);
      if (conflict.hasConflict) {
        return NextResponse.json(
          {
            conflict: true,
            message: conflict.message,
            impliedTotal: conflict.impliedTotal,
            fieldTotal: conflict.fieldTotal,
            typeConflict: conflict.typeConflict,
            impliedQuestionTypes: parsedConstraints.impliedQuestionTypes,
            fieldQuestionTypes: conflict.fieldQuestionTypes,
          },
          { status: 409 }
        );
      }
    } else if (conflictResolution === "useImplied") {
      if (parsedConstraints.impliedTotalMarks !== null) effectiveTotalMarks = parsedConstraints.impliedTotalMarks;
      if (parsedConstraints.impliedQuestionTypes !== null) effectiveQuestionTypes = parsedConstraints.impliedQuestionTypes;
    }

    try {
      await consumeQuota(userId, "PAPER_GENERATION");
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return NextResponse.json(
          { error: err.message, quotaExceeded: true, limit: err.limit, resetsAt: err.resetsAt.toISOString() },
          { status: 429 }
        );
      }
      throw err;
    }

    const config: PaperConfig = {
      subject, grade, topic, difficulty,
      totalMarks: effectiveTotalMarks,
      questionTypes: effectiveQuestionTypes,
      customPrompt: customPrompt || "",
      studyMaterialText: studyMaterialText || "",
    };

    const job = await prisma.paperGenerationJob.create({
      data: {
        userId,
        status: "queued",
        step: "planner",
        config: JSON.stringify(config),
        agentStates: JSON.stringify(initialAgentStates()),
      },
    });

    // Deliberately NOT calling processJobStep() here — see the comment
    // above maxDuration for why. The job row is the only thing this route
    // guarantees; the client's first poll (fired synchronously right after
    // this response) is what actually starts step one.
    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (error) {
    return reportApiError({ code: "GEN_JOB_CREATE_FAILED", error, route, userId });
  }
}
