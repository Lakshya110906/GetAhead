import { prisma } from "@/lib/prisma";
import {
  gradeAnswerSheetFromFile,
  MODEL_ID,
  EXTRACTION_PROMPT_VERSION,
  GRADE_BATCH_PROMPT_VERSION,
  NotAnAnswerSheetError,
  displayErrorCategory,
  UsageAccumulator,
} from "@/lib/answerSheetGrading";
import { computeGradingContentHash, lookupGradingCache, writeGradingCache } from "@/lib/gradingCache";
import { refundQuota } from "@/lib/quota";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/errorTracking";
import type { ExtractionResult, GradedAnswerSheet } from "@/lib/answerSheetSchema";

// If a job has been sitting in PROCESSING longer than this, the worker that
// claimed it is presumed dead (function crashed, was killed mid-run, etc.) —
// it becomes eligible to be re-claimed rather than being lost forever. This
// is a dead-worker reclaim, not an error-driven retry.
const STALE_PROCESSING_MS = 4 * 60 * 1000;

// There is deliberately only ONE retry layer in this pipeline: the
// per-question validation-repair loop inside gradeQuestionWithRepair
// (answerSheetGrading.ts), which re-prompts a single question up to 3 times
// when the MODEL'S OUTPUT fails validation. A job that fails for any other
// reason — quota, auth, a malformed request, an unrecognized crash, or even
// a genuinely transient network blip — is terminal on its first attempt.
// This pipeline has no per-step checkpointing (unlike paperJob.ts's step
// machine), so a job-level "retry" here can only mean restarting extraction
// plus every question's grading from scratch. Automatically doing that up to
// 3 times turned one failure into up to 3x its real cost for no benefit on
// anything that wasn't going to succeed anyway — see the call-count
// breakdown that motivated this fix. A user can still explicitly resubmit a
// FAILED evaluation (PATCH .../retry), which is a deliberate, one-shot,
// user-initiated action, not a silent automatic loop.

/**
 * Atomically claims the next job that's actually due: a fresh QUEUED row,
 * a QUEUED row whose retry backoff has elapsed, or a PROCESSING row whose
 * worker has gone silent for too long. The claim itself is a conditional
 * update (only succeeds if the row is still in the state we last saw it in),
 * so two overlapping workers can't both grab the same job.
 */
async function claimNextJob(): Promise<string | null> {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALE_PROCESSING_MS);

  const candidate = await prisma.evaluation.findFirst({
    where: {
      OR: [
        { status: "QUEUED", OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        { status: "PROCESSING", startedAt: { lt: staleThreshold } },
      ],
    },
    orderBy: { queuedAt: "asc" },
    select: { id: true, status: true },
  });

  if (!candidate) return null;

  const claim = await prisma.evaluation.updateMany({
    where: { id: candidate.id, status: candidate.status },
    data: {
      status: "PROCESSING",
      startedAt: now,
      attempts: { increment: 1 },
    },
  });

  // Someone else claimed it between our read and our write — skip it.
  if (claim.count === 0) return null;

  logger.info("Job claimed by sweep", { jobId: candidate.id, stage: "claim" });
  return candidate.id;
}

async function runJob(id: string): Promise<void> {
  const job = await prisma.evaluation.findUnique({ where: { id } });
  if (!job) return;

  // The job may have been cancelled the instant before we claimed it.
  if (job.status !== "PROCESSING") return;

  try {
    if (!job.fileUrl) {
      throw new Error("No answer sheet file is attached to this job.");
    }

    logger.info("Downloading answer sheet", { jobId: id, stage: "download", userId: job.userId });
    const fileRes = await fetch(job.fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Couldn't download the uploaded file (storage returned ${fileRes.status}).`);
    }
    const fileBytes = Buffer.from(await fileRes.arrayBuffer());
    const mimeType = job.fileType || "application/pdf";
    const grade = job.grade || "12th";

    // Grading is graded ONCE per distinct (file, subject, grade, examType,
    // prompt versions, model) — Gemini's grading call is not deterministic
    // even at temperature 0 (measured directly: the same clear-cut error on
    // a fixed extraction scored 2/5 in 3 of 4 identical live samples and
    // 1/5 in the 4th), so re-grading an unchanged file would silently risk
    // handing back a different mark than last time. See gradingCache.ts.
    const promptVersion = `${EXTRACTION_PROMPT_VERSION}.${GRADE_BATCH_PROMPT_VERSION}`;
    const contentHash = computeGradingContentHash({
      fileBytes,
      subject: job.subject,
      grade,
      examType: job.examType,
      modelId: MODEL_ID,
      promptVersion,
    });

    let extraction: ExtractionResult;
    let result: GradedAnswerSheet;
    let usage = new UsageAccumulator();
    let gradedFromCache = false;

    const cached = job.bypassGradingCache ? null : await lookupGradingCache(contentHash);
    if (cached) {
      logger.info("Reusing cached grading result — identical input already graded", { jobId: id, stage: "grade", subject: job.subject });
      ({ extraction, result } = cached);
      gradedFromCache = true;
    } else {
      logger.info("Sending to Gemini: extraction, then one grading call per question", { jobId: id, stage: "transcribe", subject: job.subject });
      const graded = await gradeAnswerSheetFromFile(
        fileBytes,
        mimeType,
        {
          subject: job.subject,
          grade,
          examType: job.examType,
        },
        { correlationId: id, userId: job.userId ?? undefined }
      );
      ({ result, extraction, usage } = graded);
      // Stored (or, on an explicit regrade, overwritten) so every future
      // identical upload reuses THIS result instead of re-grading — the
      // fresh sample from an explicit regrade becomes the new answer served
      // from here on, which is the intended effect of that action.
      await writeGradingCache({ contentHash, modelId: MODEL_ID, promptVersion, subject: job.subject, grade, examType: job.examType, extraction, result });
    }

    logger.info("Grading complete", {
      jobId: id,
      stage: "grade",
      obtainedMarks: result.obtainedMarks,
      totalMarks: result.totalMarks,
      totalTokens: usage.totalTokens,
      gradedFromCache,
    });

    // strengths/weaknesses/recommendations are derived here, in code, from
    // the actual per-question grades — never a separate model call asked to
    // "summarize strengths," which is exactly the kind of ungrounded text
    // generation this rebuild removes. Every string traces back to a real,
    // validated question grade.
    const strengths = result.questionGrades
      .filter((g) => g.errorType === "correct")
      .map((g) => `Q${g.questionNumber}: ${g.feedback}`);
    const weaknesses = result.questionGrades
      .filter((g) => g.errorType === "incorrect")
      .map((g) => {
        const category = displayErrorCategory(g);
        return category ? `Q${g.questionNumber} (${category}): ${g.feedback}` : `Q${g.questionNumber}: ${g.feedback}`;
      });
    const recommendations = result.questionGrades
      .filter((g) => g.errorType === "incorrect")
      .map((g) => `Revisit ${g.topic || `Q${g.questionNumber}`}: ${g.incorrectPoints[0] || g.feedback}`);

    await prisma.evaluation.update({
      where: { id },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        // Total is always the sum of the questions actually graded — never a
        // fixed or externally-declared denominator (see answerSheetGrading.ts).
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        // aiResponse now holds the full GradedAnswerSheet: per-question
        // marks, correct/incorrect points, groundingQuote, errorType
        // (correct/incorrect/unreadable/blank) with a free-text
        // errorCategory for the "incorrect" case, topic tags, and mismatch
        // flags — not a topic-only rollup.
        aiResponse: JSON.stringify(result),
        marksBreakdown: result.topicBreakdown ? JSON.stringify(result.topicBreakdown) : null,
        aiFeedback: result.overallFeedback,
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
        recommendations: JSON.stringify(recommendations),
        // The structured extraction (every question + the student's full
        // transcribed working), not raw OCR prose — this is what the tutor
        // (section 6) and any future audit need to ground answers in what
        // was actually written, not just a topic summary.
        ocrText: JSON.stringify(extraction),
        modelId: MODEL_ID,
        // Was `${EXTRACTION_PROMPT_VERSION}.${GRADE_PROMPT_VERSION}` — the
        // per-question prompt's version constant, even though
        // gradeAnswerSheetFromFile's default (and only mode this worker
        // uses) is "batched", governed by GRADE_BATCH_PROMPT_VERSION. Fixed
        // while touching this line for the grading-cache work: the audit
        // trail this field exists for ("why did this student get X marks")
        // was recording the wrong prompt version for every batched-mode row.
        promptVersion,
        rubricVersion: "answer-sheet-rebuild-2026-08-v1",
        rawModelResponse: JSON.stringify({ extraction, questionGrades: result.questionGrades }),
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        gradedFromCache,
        bypassGradingCache: false,
      },
    });
    logger.info("Job persisted", { jobId: id, stage: "persist", status: "SUCCEEDED" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The evaluation failed for an unknown reason.";
    logger.error("Evaluation job failed", { jobId: id, stage: "persist", attempt: job.attempts, error: message });
    captureException(error, { jobId: id, stage: "persist", attempt: job.attempts, subject: job.subject });

    await prisma.evaluation.update({
      where: { id },
      data: { status: "FAILED", finishedAt: new Date(), lastError: message },
    });

    // Refund every terminal failure except NotAnAnswerSheetError — that one
    // means the user uploaded a file that isn't a gradable answer sheet,
    // which is a problem with their input, not the pipeline. Everything
    // else (daily quota exhausted, grading validation exhausted, auth,
    // malformed responses, an unrecognized crash) is not the user's fault
    // and shouldn't cost them a daily evaluation — matching paperJob.ts's
    // refund behavior on its own terminal failure paths, and specifically
    // fixing quota parity: DailyQuotaExhaustedError now fails immediately
    // and refunds here, the same as it already does for paper generation.
    if (!(error instanceof NotAnAnswerSheetError)) {
      await refundQuota(job.userId, "EVALUATION");
    }
  }
}

/** Claims and runs exactly one due job, if any exists. Returns whether it did. */
export async function processOneDueJob(): Promise<boolean> {
  const id = await claimNextJob();
  if (!id) return false;
  await runJob(id);
  return true;
}

/** Claims and runs one specific job — used for the immediate post-enqueue trigger. */
export async function processSpecificJob(id: string): Promise<void> {
  const now = new Date();
  const claim = await prisma.evaluation.updateMany({
    where: { id, status: "QUEUED" },
    data: { status: "PROCESSING", startedAt: now, attempts: { increment: 1 } },
  });
  if (claim.count === 0) return; // already claimed (e.g. by the sweep) or not queued anymore
  logger.info("Job claimed by immediate trigger", { jobId: id, stage: "claim" });
  await runJob(id);
}
