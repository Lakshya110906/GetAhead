import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuestionPaper, DailyQuotaExhaustedError, PaperValidationFailedError } from "@/lib/question-agents";
import { buildUserFacingValidationMessage } from "@/lib/paperUserMessages";
import { consumeQuota, refundQuota, QuotaExceededError } from "@/lib/quota";
import { assertSpendGateOpen, SpendLimitReachedError } from "@/lib/spendControl";
import { parseCustomInstructions, checkForConflict } from "@/lib/paperConstraintParser";

// Dead code from the frontend's perspective (only /api/papers is called by
// /generate-paper now), but kept working and consistent — same conflict
// gate, resolved defaults, and refund-on-hard-failure behavior. Also runs
// the full synchronous pipeline in one invocation, so it needs the same
// stopgap maxDuration as generate-stream/route.ts for the same reason
// (three sequential Gemini calls plus any repair loop can exceed a short
// default timeout) — see that file's comment for the full explanation.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

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
    institutionName, courseCode, timeAllowed, instructions,
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

  try {
    const result = await generateQuestionPaper({
      subject,
      grade,
      topic,
      difficulty,
      totalMarks: effectiveTotalMarks,
      questionTypes: effectiveQuestionTypes,
      customPrompt: customPrompt || "",
      studyMaterialText: studyMaterialText || "",
    });

    const dbPayload = {
      ...result,
      metadata: {
        institutionName: institutionName || "",
        courseCode: courseCode || "",
        timeAllowed: timeAllowed || result.paper.timeAllowed,
        instructions: instructions || ""
      }
    };

    const savedPaper = await prisma.questionPaper.create({
      data: {
        userId,
        subject,
        grade,
        difficulty,
        totalMarks: result.paper.totalMarks,
        title: result.paper.title,
        content: JSON.stringify(dbPayload)
      }
    });

    return NextResponse.json({ success: true, paper: savedPaper });
  } catch (error) {
    if (error instanceof DailyQuotaExhaustedError) {
      await refundQuota(userId, "PAPER_GENERATION");
      return NextResponse.json(
        {
          error: "The AI service's shared daily request quota is exhausted for today — this is not something retrying will fix. Your generation credit has been refunded; please try again after the quota resets (daily, at midnight UTC).",
          quotaRefunded: true,
          retryWorthwhile: false,
        },
        { status: 503 }
      );
    }
    if (error instanceof PaperValidationFailedError) {
      await refundQuota(userId, "PAPER_GENERATION");
      const lastTwo = error.attemptLogs.slice(-2);
      const identicalLastTwo =
        lastTwo.length === 2 && [...lastTwo[0].violations].sort().join("|") === [...lastTwo[1].violations].sort().join("|");
      return NextResponse.json(
        {
          error: buildUserFacingValidationMessage(error.finalViolations, topic),
          quotaRefunded: true,
          retryWorthwhile: !identicalLastTwo,
          attemptLogs: error.attemptLogs,
        },
        { status: 422 }
      );
    }
    console.error("API generate questions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
