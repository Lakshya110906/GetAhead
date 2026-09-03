import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processSpecificJob } from "@/lib/evaluationWorker";
import { reportApiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { NOT_AN_ANSWER_SHEET_MESSAGE, MODEL_ID as EVAL_MODEL_ID } from "@/lib/answerSheetGrading";
import { consumeQuota, QuotaExceededError } from "@/lib/quota";
import { assertQuotaHeadroom, QuotaHeadroomError, PreviewEnvironmentBlockedError } from "@/lib/geminiQuotaState";

export const maxDuration = 60;

async function getOwnedJob(id: string, userId: string) {
  const job = await prisma.evaluation.findUnique({ where: { id } });
  if (!job || job.userId !== userId) return null;
  return job;
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/evaluations/[id]">
) {
  let userId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = (session.user as { id: string }).id;
    const { id } = await ctx.params;

    const job = await getOwnedJob(id, userId);
    if (!job) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    // PaperGenerationJob has retryWorthwhile; Evaluation never did, so
    // every failure — including "this file genuinely isn't an answer
    // sheet," which will fail identically no matter how many times it's
    // retried with the same file — showed the same "Retry evaluation"
    // button as a transient failure. Derived from the persisted lastError
    // text since that's all a FAILED row retains (the original Error
    // instance is gone by the time this polls).
    const retryWorthwhile = job.lastError !== NOT_AN_ANSWER_SHEET_MESSAGE;

    const base = {
      id: job.id,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastError: job.status === "FAILED" || job.status === "QUEUED" ? job.lastError : null,
      retryWorthwhile: job.status === "FAILED" ? retryWorthwhile : true,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };

    if (job.status !== "SUCCEEDED") {
      return NextResponse.json(base);
    }

    // Defense in depth: a row genuinely graded by evaluateAnswerSheetFromFile()
    // always has modelId (and promptVersion, rubricVersion) set in the same
    // write that sets status to SUCCEEDED (see evaluationWorker.ts) — there is
    // no code path that produces one without the other. A SUCCEEDED row
    // missing that audit trail cannot have come from a real grading call, so
    // it must never be rendered as a report, regardless of what its
    // totalMarks/obtainedMarks fields say. (This is exactly the shape of a
    // set of stale rows found and purged from this database: status
    // "SUCCEEDED"/"COMPLETED" with modelId null, left over from a client-side
    // mock deleted from source over a month before this check was added.)
    if (!job.modelId || !job.promptVersion) {
      return NextResponse.json(
        { ...base, status: "FAILED", lastError: "This evaluation is missing its grading audit trail and cannot be displayed as a result. Please re-run the evaluation." },
        { status: 200 }
      );
    }

    // The full GradedAnswerSheet (per-question marks, correct/incorrect
    // points, groundingQuote, errorType, topic tags, mismatch flags) lives in
    // aiResponse — surfaced in full so the report can show grounding quotes
    // and the tutor's context (built elsewhere from the same row) can cite
    // the same data the report displays, never a separate summary that could
    // drift from it.
    let questionGrades = null;
    let unreadableQuestions: number[] = [];
    let subjectMismatch = null;
    let gradeMismatch = null;
    if (job.aiResponse) {
      try {
        const parsed = JSON.parse(job.aiResponse);
        questionGrades = parsed.questionGrades ?? null;
        unreadableQuestions = parsed.unreadableQuestions ?? [];
        subjectMismatch = parsed.subjectMismatch ?? null;
        gradeMismatch = parsed.gradeMismatch ?? null;
      } catch {
        questionGrades = null;
      }
    }

    return NextResponse.json({
      ...base,
      result: {
        totalMarks: job.totalMarks,
        obtainedMarks: job.obtainedMarks,
        percentage: job.percentage,
        aiFeedback: job.aiFeedback,
        marksBreakdown: job.marksBreakdown ? JSON.parse(job.marksBreakdown) : null,
        questionGrades,
        unreadableQuestions,
        subjectMismatch,
        gradeMismatch,
        strengths: job.strengths ? JSON.parse(job.strengths) : [],
        weaknesses: job.weaknesses ? JSON.parse(job.weaknesses) : [],
        recommendations: job.recommendations ? JSON.parse(job.recommendations) : [],
      },
    });
  } catch (error) {
    return reportApiError({ code: "EVAL_STATUS_FAILED", error, route: "GET /api/evaluations/[id]", userId });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/evaluations/[id]">
) {
  let userId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = (session.user as { id: string }).id;
    const { id } = await ctx.params;

    const job = await getOwnedJob(id, userId);
    if (!job) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    const { action } = await request.json();

    if (action === "cancel") {
      if (job.status !== "QUEUED") {
        return NextResponse.json(
          { error: job.status === "PROCESSING" ? "This evaluation is already running and can't be cancelled." : "This evaluation has already finished." },
          { status: 409 }
        );
      }
      const updated = await prisma.evaluation.update({
        where: { id },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
      return NextResponse.json({ status: updated.status });
    }

    if (action === "retry") {
      if (job.status !== "FAILED") {
        return NextResponse.json(
          { error: "Only an evaluation that has failed can be retried." },
          { status: 409 }
        );
      }
      // Retry reprocesses the SAME stored file — for a file that genuinely
      // isn't an answer sheet, that will fail identically every time, no
      // matter how many attempts. Refused server-side, not just hidden in
      // the UI, so a stale page or a direct API call can't still burn a
      // quota unit and a Gemini call on a deterministically doomed retry.
      if (job.lastError === NOT_AN_ANSWER_SHEET_MESSAGE) {
        return NextResponse.json(
          { error: "This file doesn't look like an answer sheet, so retrying won't produce a different result. Upload a different file instead." },
          { status: 409 }
        );
      }
      const updated = await prisma.evaluation.update({
        where: { id },
        data: {
          status: "QUEUED",
          attempts: 0,
          nextAttemptAt: null,
          startedAt: null,
          finishedAt: null,
        },
      });
      after(async () => {
        try {
          await processSpecificJob(updated.id);
        } catch (err) {
          logger.error(`Background worker trigger failed on retry for job ${updated.id}`, {
            route: "PATCH /api/evaluations/[id]",
            jobId: updated.id,
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
        }
      });
      return NextResponse.json({ status: updated.status });
    }

    if (action === "regrade") {
      // Unlike "retry" (a failed job resuming its own first attempt),
      // "regrade" deliberately re-runs a job that already SUCCEEDED — the
      // only sanctioned way to get a different grade for an unchanged file
      // (see gradingCache.ts). Explicit and user-initiated, never automatic:
      // the UI must disclose that marks may differ from the result already
      // shown before calling this.
      if (job.status !== "SUCCEEDED") {
        return NextResponse.json(
          { error: "Only a completed evaluation can be re-evaluated." },
          { status: 409 }
        );
      }

      // This always costs a real Gemini call (it bypasses the grading
      // cache by design), so it goes through the same preflight gates as a
      // brand new evaluation: Gemini's shared daily headroom, then this
      // user's own daily evaluation quota.
      try {
        await assertQuotaHeadroom(EVAL_MODEL_ID, 2);
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
        await consumeQuota(job.userId, "EVALUATION");
      } catch (err) {
        if (err instanceof QuotaExceededError) {
          return NextResponse.json(
            { error: err.message, quotaExceeded: true, limit: err.limit, resetsAt: err.resetsAt.toISOString() },
            { status: 429 }
          );
        }
        throw err;
      }

      const updated = await prisma.evaluation.update({
        where: { id },
        data: {
          status: "QUEUED",
          attempts: 0,
          nextAttemptAt: null,
          startedAt: null,
          finishedAt: null,
          bypassGradingCache: true,
        },
      });
      after(async () => {
        try {
          await processSpecificJob(updated.id);
        } catch (err) {
          logger.error(`Background worker trigger failed on regrade for job ${updated.id}`, {
            route: "PATCH /api/evaluations/[id]",
            jobId: updated.id,
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
        }
      });
      return NextResponse.json({ status: updated.status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return reportApiError({ code: "EVAL_STATUS_FAILED", error, route: "PATCH /api/evaluations/[id]", userId });
  }
}
