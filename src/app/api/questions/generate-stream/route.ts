import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuestionPaperStreamed, DailyQuotaExhaustedError, PaperValidationFailedError } from "@/lib/question-agents";
import { consumeQuota, refundQuota, QuotaExceededError } from "@/lib/quota";
import { assertSpendGateOpen, SpendLimitReachedError } from "@/lib/spendControl";
import { parseCustomInstructions, checkForConflict } from "@/lib/paperConstraintParser";

export const maxDuration = 120; // 2 minutes for long AI calls

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
          emit("error", {
            message: `We couldn't generate a paper that satisfies your request after ${err.attemptLogs.length} attempts. Remaining issue(s): ${err.finalViolations.join("; ")}. Your generation credit has been refunded — try adjusting your total marks, question count, or custom instructions so they don't conflict, then try again.`,
            quotaRefunded: true,
            retryWorthwhile: true,
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
