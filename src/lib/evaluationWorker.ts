import { prisma } from "@/lib/prisma";
import { evaluateAnswerSheetFromFile } from "@/lib/gemini";

// If a job has been sitting in PROCESSING longer than this, the worker that
// claimed it is presumed dead (function crashed, was killed mid-run, etc.) —
// it becomes eligible to be re-claimed rather than being lost forever.
const STALE_PROCESSING_MS = 4 * 60 * 1000;

const BACKOFF_BASE_MS = 30 * 1000; // 30s, 2min, 8min for attempts 1, 2, 3
const MAX_ATTEMPTS = 3;

function backoffDelayMs(attemptsSoFar: number): number {
  return BACKOFF_BASE_MS * Math.pow(4, Math.max(0, attemptsSoFar - 1));
}

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

    const fileRes = await fetch(job.fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Couldn't download the uploaded file (storage returned ${fileRes.status}).`);
    }
    const fileBytes = Buffer.from(await fileRes.arrayBuffer());
    const mimeType = job.fileType || "application/pdf";

    const graded = await evaluateAnswerSheetFromFile(
      job.subject,
      job.grade || "12th",
      job.examType,
      fileBytes,
      mimeType
    );
    const { result } = graded;

    await prisma.evaluation.update({
      where: { id },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        // Marks below are exactly what recomputeFromQuestionMarks() in
        // lib/gemini.ts computed from the per-question breakdown in code —
        // never the model's own totalMarks/obtainedMarks/percentage.
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        aiResponse: JSON.stringify(result),
        marksBreakdown: JSON.stringify(result.subjectBreakdown),
        aiFeedback: result.overallFeedback,
        strengths: JSON.stringify(result.strengths),
        weaknesses: JSON.stringify(result.weaknesses),
        recommendations: JSON.stringify(result.recommendations),
        ocrText: graded.extractedText,
        // Audit trail: what model, what exact prompt (by hash), what
        // rubric version, and the model's raw response before parsing.
        modelId: graded.modelId,
        promptVersion: graded.promptVersion,
        rubricVersion: graded.rubricVersion,
        rawModelResponse: graded.rawModelResponse,
        promptTokens: graded.promptTokens,
        completionTokens: graded.completionTokens,
        totalTokens: graded.totalTokens,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The evaluation failed for an unknown reason.";
    console.error(`Evaluation job ${id} failed (attempt ${job.attempts}):`, error);

    if (job.attempts >= MAX_ATTEMPTS) {
      await prisma.evaluation.update({
        where: { id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          lastError: message,
        },
      });
    } else {
      await prisma.evaluation.update({
        where: { id },
        data: {
          status: "QUEUED",
          lastError: message,
          nextAttemptAt: new Date(Date.now() + backoffDelayMs(job.attempts)),
        },
      });
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
  await runJob(id);
}
