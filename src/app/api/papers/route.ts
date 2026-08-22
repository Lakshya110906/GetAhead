import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeQuota, QuotaExceededError } from "@/lib/quota";
import { assertSpendGateOpen, SpendLimitReachedError } from "@/lib/spendControl";
import { assertQuotaHeadroom, QuotaHeadroomError, PreviewEnvironmentBlockedError } from "@/lib/geminiQuotaState";
import { MODEL_ID as PAPER_MODEL_ID } from "@/lib/question-agents";
import { parseCustomInstructions, checkForConflict } from "@/lib/paperConstraintParser";
import { suggestTopicCorrection } from "@/lib/topicSpellcheck";
import { initialAgentStates, processJobStep } from "@/lib/paperJob";
import { reportApiError } from "@/lib/apiError";
import { zodErrorResponse } from "@/lib/zodError";
import { logger } from "@/lib/logger";
import { normalizeEntryText } from "@/lib/normalizeText";
import type { PaperConfig } from "@/lib/question-agents";
import { userStillExists } from "@/lib/requireLiveUser";

// Bounds mirror the actual UI inputs (generate-paper/page.tsx), not an
// arbitrary guess: totalMarks is a number input with min=5/max=200 there,
// and questionTypes is a fixed 3-option checkbox group. This was previously
// unvalidated past "is it present" — totalMarks only got an isNaN check, so
// a negative total or a 3-word subject were both accepted and reached the
// paper-generation pipeline as-is.
const generatePaperSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  grade: z.string().trim().min(1, "Grade is required").max(100),
  topic: z.string().trim().min(1, "Topic is required").max(300),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  totalMarks: z.coerce.number().int().min(5, "Total marks must be at least 5").max(200, "Total marks cannot exceed 200"),
  questionTypes: z.array(z.enum(["MCQ", "Short Answer", "Long Answer"])).min(1, "Select at least one question type"),
  customPrompt: z.string().max(5000).optional(),
  studyMaterialText: z.string().max(100_000).optional(),
  conflictResolution: z.enum(["useImplied", "useField"]).optional(),
  topicResolution: z.enum(["useOriginal", "useSuggested"]).optional(),
  suggestedTopic: z.string().trim().min(1).optional(),
});

// Deliberately small — this route only validates input, resolves conflicts,
// and writes a "queued" row; it must never do real Gemini work itself in the
// request/response path.
//
// HISTORY, twice now: this route originally awaited processJobStep() inline
// ("to feel instant") and got killed by its own maxDuration — fixed by
// removing the inline await entirely and relying on the client's first poll
// to drive step one. That just moved the identical bug onto
// GET /api/papers/[id] instead (confirmed live: "[TIMING] Planner Agent
// attempt 1: 8.40s" immediately followed by a 15s timeout, 504, on the poll
// route). The real fix, mirroring evaluationWorker.ts's already-proven
// pattern in this codebase: kick step one via after() — runs in the
// background after this response is already sent, so it costs the client
// nothing, and it's not the poll's job to do it. GET is now a pure read;
// see POST /api/papers/[id]/advance for where steps actually run.
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

    if (!(await userStillExists(userId))) {
      return NextResponse.json({ error: "Your account is no longer valid. Please sign in again." }, { status: 401 });
    }

    try {
      await assertSpendGateOpen();
    } catch (err) {
      if (err instanceof SpendLimitReachedError) {
        return NextResponse.json({ error: err.message, maintenance: true }, { status: 503 });
      }
      throw err;
    }

    const parsedBody = generatePaperSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return zodErrorResponse(parsedBody.error);
    }
    const {
      difficulty, questionTypes,
      customPrompt, studyMaterialText, conflictResolution, topicResolution, suggestedTopic,
    } = parsedBody.data;
    const parsedTotalMarks = parsedBody.data.totalMarks;
    // Normalized once, here, at the entry point — every downstream
    // consumer (validation, the topic-typo suggestion, the job config
    // that's persisted, analytics grouping by subject) sees the same
    // trimmed, whitespace-collapsed value instead of each needing its own
    // tolerance for a stray leading/trailing/doubled space. This is the
    // same class of bug as the "trigonometry " topic-validation incident,
    // fixed at its actual source instead of downstream.
    const subject = normalizeEntryText(parsedBody.data.subject);
    const grade = normalizeEntryText(parsedBody.data.grade);
    const topic = normalizeEntryText(parsedBody.data.topic);

    // Catch a likely topic typo BEFORE spending any Gemini calls — this is
    // the actual fix for a real, confirmed-live incident: "trignometry and
    // geometry" burned 5 calls across 3 repair attempts because the model
    // (correctly) spelled it "trigonometry" and the old prose-substring
    // validator never matched. Only fires on a high-confidence typo against
    // a known-topic vocabulary; most real topics aren't in that vocabulary
    // and pass through untouched.
    let effectiveTopic: string = topic;
    if (!topicResolution) {
      const correction = suggestTopicCorrection(topic);
      if (correction) {
        return NextResponse.json(
          {
            topicSuggestion: true,
            original: correction.original,
            suggestion: correction.suggestion,
          },
          { status: 409 }
        );
      }
    } else if (topicResolution === "useSuggested" && suggestedTopic) {
      effectiveTopic = normalizeEntryText(suggestedTopic);
    }
    // topicResolution === "useOriginal" (or anything else): keep the user's
    // topic exactly as typed — validatePaper() still matches on the
    // spellcheck-corrected keyword set even if they declined the suggestion.

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

    // Gemini's own daily quota: best case is 3 requests (planner +
    // generator + reviewer), but a repair loop can add up to 2 more (one
    // repair call per failed validate attempt, MAX_STEP_ATTEMPTS=3 total
    // attempts). Checking only the best case meant a job could clear this
    // gate with 3 requests of headroom, spend all 3 getting to the validate
    // step, hit a violation, and then hit DailyQuotaExhaustedError on the
    // repair call — the exact "quota spent, no paper produced" failure
    // mode this check exists to prevent. Reserving the worst case means a
    // job that starts is one that can actually finish.
    try {
      await assertQuotaHeadroom(PAPER_MODEL_ID, 5);
    } catch (err) {
      if (err instanceof QuotaHeadroomError) {
        return NextResponse.json(
          { error: err.message, quotaExceeded: true, remaining: err.usage.remaining, limit: err.usage.limit, resetsAt: err.usage.resetsAt },
          { status: 503 }
        );
      }
      if (err instanceof PreviewEnvironmentBlockedError) {
        return NextResponse.json({ error: err.message, previewBlocked: true }, { status: 503 });
      }
      throw err;
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
      subject, grade, topic: effectiveTopic, difficulty,
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

    // Fire step one in the background — after() runs once this response has
    // already been sent, so a slow (or even timed-out) Gemini call here
    // never costs the client anything and never risks this route's own
    // maxDuration. Same pattern as processSpecificJob() in
    // evaluationWorker.ts, which has never had this bug.
    after(async () => {
      try {
        await processJobStep(job.id);
      } catch (err) {
        logger.error(`Background step-one trigger failed for job ${job.id}`, {
          route: "POST /api/papers (after)",
          jobId: job.id,
          userId,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (error) {
    return reportApiError({ code: "GEN_JOB_CREATE_FAILED", error, route, userId });
  }
}
