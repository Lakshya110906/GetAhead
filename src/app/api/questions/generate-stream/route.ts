import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuestionPaperStreamed, DailyQuotaExhaustedError, PaperValidationFailedError } from "@/lib/question-agents";
import { buildUserFacingValidationMessage } from "@/lib/paperUserMessages";
import { consumeQuota, refundQuota, QuotaExceededError } from "@/lib/quota";
import { assertSpendGateOpen, SpendLimitReachedError } from "@/lib/spendControl";
import { assertQuotaHeadroom, QuotaHeadroomError } from "@/lib/geminiQuotaState";
import { MODEL_ID as PAPER_MODEL_ID } from "@/lib/question-agents";
import { parseCustomInstructions, checkForConflict } from "@/lib/paperConstraintParser";

// STOPGAP, not the fix — this route holds one serverless invocation open for
// the entire Planner->Generator->Reviewer(->repair) pipeline, which is
// exactly what produced a live, confirmed production failure: "Vercel
// Runtime Timeout Error: Task timed out after 120 seconds" while this route
// was mid-stream. Three sequential Gemini calls plus any repair-loop
// iteration can exceed 120s (planner alone measured at 9s live; generator/
// reviewer are 2-4x larger prompts). Raising this to 300 — the Hobby plan's
// documented maxDuration ceiling with Fluid Compute — buys more headroom for
// this legacy route today, but does not fix the architecture: a paper
// needing two repair passes can still exceed even 300s, and this route still
// gives the client nothing if it's killed mid-stream (no client-side timeout
// existed before this pass — see generate-paper/page.tsx). The real fix is
// the job-based /api/papers + /api/papers/[id] + processJobStep() pipeline
// (src/lib/paperJob.ts), which the frontend now uses instead of this route.
// This route is kept only for the non-streaming dead-code path's parity
// (see generate/route.ts) and is not called by the current UI.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const sessionUserId = (session.user as { id: string }).id;

  try {
    await assertSpendGateOpen();
  } catch (err) {
    if (err instanceof SpendLimitReachedError) {
      return new Response(JSON.stringify({ error: err.message, maintenance: true }), { status: 503 });
    }
    throw err;
  }

  const body = await request.json();
  const {
    subject, grade, topic, difficulty, totalMarks, questionTypes,
    institutionName, courseCode, timeAllowed, instructions,
    customPrompt, studyMaterialText,
    conflictResolution, // "useImplied" | "useField" | undefined — set once the user has picked in response to a 409
  } = body;

  if (!subject || !grade || !topic || !difficulty || !totalMarks || !questionTypes || !Array.isArray(questionTypes)) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const parsedTotalMarks = parseInt(totalMarks);
  if (isNaN(parsedTotalMarks)) {
    return new Response(JSON.stringify({ error: "Invalid total marks" }), { status: 400 });
  }

  // ── Conflict-detection gate ────────────────────────────────────────────────
  // Runs BEFORE quota is consumed and BEFORE any Gemini call — checking free
  // text for explicit numeric constraints (question count / marks-per-question
  // / total marks / question types) is pure string parsing, and disagreeing
  // with the structured fields is exactly the case that used to be "resolved"
  // by silently honouring neither (Total Marks: 6 vs. the requested 30, from
  // "5 questions each of 10 marks" against a 30-mark target). See
  // paperConstraintParser.ts's documented precedence rule: an explicit
  // instruction beats the structured field, but only once the user has
  // confirmed which one they meant — never silently.
  const parsedConstraints = parseCustomInstructions(customPrompt);
  let effectiveTotalMarks = parsedTotalMarks;
  let effectiveQuestionTypes: string[] = questionTypes;

  if (!conflictResolution) {
    const conflict = checkForConflict(parsedConstraints, parsedTotalMarks, questionTypes);
    if (conflict.hasConflict) {
      return new Response(
        JSON.stringify({
          conflict: true,
          message: conflict.message,
          impliedTotal: conflict.impliedTotal,
          fieldTotal: conflict.fieldTotal,
          typeConflict: conflict.typeConflict,
          impliedQuestionTypes: parsedConstraints.impliedQuestionTypes,
          fieldQuestionTypes: conflict.fieldQuestionTypes,
        }),
        { status: 409 }
      );
    }
  } else if (conflictResolution === "useImplied") {
    if (parsedConstraints.impliedTotalMarks !== null) effectiveTotalMarks = parsedConstraints.impliedTotalMarks;
    if (parsedConstraints.impliedQuestionTypes !== null) effectiveQuestionTypes = parsedConstraints.impliedQuestionTypes;
  }
  // conflictResolution === "useField" (or no parsed constraints at all): the
  // structured fields already govern, effectiveTotalMarks/effectiveQuestionTypes
  // keep their field-derived defaults set above.

  try {
    await assertQuotaHeadroom(PAPER_MODEL_ID, 3);
  } catch (err) {
    if (err instanceof QuotaHeadroomError) {
      return new Response(
        JSON.stringify({ error: err.message, quotaExceeded: true, remaining: err.usage.remaining, limit: err.usage.limit, resetsAt: err.usage.resetsAt }),
        { status: 503 }
      );
    }
    throw err;
  }

  try {
    await consumeQuota(sessionUserId, "PAPER_GENERATION");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: err.message, quotaExceeded: true, limit: err.limit, resetsAt: err.resetsAt.toISOString() }),
        { status: 429 }
      );
    }
    throw err;
  }

  const userId = (session.user as { id: string }).id;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        const payload = `data: ${JSON.stringify({ event, ...( typeof data === 'object' && data !== null ? data : { data }) })}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        const result = await generateQuestionPaperStreamed(
          {
            subject,
            grade,
            topic,
            difficulty,
            totalMarks: effectiveTotalMarks,
            questionTypes: effectiveQuestionTypes,
            customPrompt: customPrompt || "",
            studyMaterialText: studyMaterialText || "",
          },
          emit
        );

        // Save to database. timeAllowed: the client sends a value that
        // already tracks total marks by default (see computeTimeAllowed() in
        // timeAllowed.ts, used both client-side and here) and only diverges
        // from that if the user deliberately typed something else — so a
        // present value is trusted, and only an empty one falls back to the
        // paper's own computed time. institutionName/courseCode are left
        // blank unless the user supplied them — no fake defaults re-injected
        // at save time.
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
            subject, grade, difficulty,
            totalMarks: result.paper.totalMarks,
            title: result.paper.title,
            content: JSON.stringify(dbPayload)
          }
        });

        emit("complete", { paper: savedPaper });
      } catch (err) {
        // Hard failures that are not the user's fault (shared daily quota
        // exhausted, or the repair loop couldn't produce a valid paper after
        // 3 attempts) must not cost the user one of their 10 daily
        // generations — refund it and say so explicitly, rather than a
        // generic "Something went wrong" that leaves them guessing whether
        // to retry.
        if (err instanceof DailyQuotaExhaustedError) {
          await refundQuota(sessionUserId, "PAPER_GENERATION");
          emit("error", {
            message: "The AI service's shared daily request quota is exhausted for today — this is not something retrying will fix. Your generation credit has been refunded; please try again after the quota resets (daily, at midnight UTC).",
            quotaRefunded: true,
            retryWorthwhile: false,
          });
        } else if (err instanceof PaperValidationFailedError) {
          await refundQuota(sessionUserId, "PAPER_GENERATION");
          // Deterministic unless the last two attempts' violations genuinely
          // differed (some chance a fresh attempt lands differently) — same
          // classification as the job-based path (paperJob.ts).
          const lastTwo = err.attemptLogs.slice(-2);
          const identicalLastTwo =
            lastTwo.length === 2 && [...lastTwo[0].violations].sort().join("|") === [...lastTwo[1].violations].sort().join("|");
          emit("error", {
            message: buildUserFacingValidationMessage(err.finalViolations, topic),
            quotaRefunded: true,
            retryWorthwhile: !identicalLastTwo,
            attemptLogs: err.attemptLogs,
          });
        } else {
          const msg = err instanceof Error ? err.message : "Generation failed";
          emit("error", { message: msg, retryWorthwhile: true });
        }
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}
