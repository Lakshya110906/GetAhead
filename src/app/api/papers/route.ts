import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeQuota, QuotaExceededError } from "@/lib/quota";
import { assertSpendGateOpen, SpendLimitReachedError } from "@/lib/spendControl";
import { parseCustomInstructions, checkForConflict } from "@/lib/paperConstraintParser";
import { initialAgentStates, processJobStep } from "@/lib/paperJob";
import type { PaperConfig } from "@/lib/question-agents";

// Deliberately small — this route only validates input, resolves conflicts,
// and writes a "queued" row. It must return in well under a second; the
// actual generation work happens in processJobStep(), invoked once here
// (fire-and-forget-ish, see below) and again on every subsequent poll.
export const maxDuration = 15;

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

  // Kick the pipeline immediately rather than waiting for the client's first
  // poll — this is what makes the common case feel instant instead of
  // waiting a full poll interval before anything visibly starts. Awaited
  // (one bounded step, typically the planner call, ~9s measured live) but
  // capped by this route's own 15s maxDuration; if the client's connection
  // drops or this route is itself killed mid-await, the job row already
  // exists as "queued" and the very next poll (or the daily cron sweep)
  // picks it up and continues — this is the whole point of persisting
  // state to the row before doing any Gemini work, not after.
  try {
    await processJobStep(job.id);
  } catch {
    // Swallow — the job row's own status/error fields are the source of
    // truth the client polls against, not this response.
  }

  return NextResponse.json({ jobId: job.id }, { status: 201 });
}
