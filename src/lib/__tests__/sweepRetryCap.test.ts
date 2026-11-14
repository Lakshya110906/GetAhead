import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

// The worker only downloads files from one of our own Blob stores.
process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_TestStore_secret";

// Regression cover for the 10-12 Nov 2026 sweep incident. One 19-page
// answer sheet could not be graded inside a 60s function, and because
// claimNextJob never checked maxAttempts it was reclaimed 12 times in three
// days (attempts=12, maxAttempts=3), each attempt re-paying a ~50s
// extraction call whose result was thrown away when the function died.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      // Field reference used by `attempts < maxAttempts`.
      fields: { maxAttempts: { name: "maxAttempts", modelName: "Evaluation" } },
    },
    gradingCache: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock("@/lib/quota", () => ({ refundQuota: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/errorTracking", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/answerSheetGrading", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/answerSheetGrading")>();
  return { ...actual, gradeAnswerSheetFromFile: vi.fn() };
});

const mocked = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

describe("claimNextJob — never claims a job that has used up its attempts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters on attempts < maxAttempts (a column comparison, not a constant)", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { claimNextJob } = await import("@/lib/evaluationWorker");
    mocked(prisma.evaluation.findFirst).mockResolvedValue(null);

    await claimNextJob();

    const where = mocked(prisma.evaluation.findFirst).mock.calls[0][0].where;
    expect(where.attempts).toEqual({ lt: prisma.evaluation.fields.maxAttempts });
  });
});

describe("failExhaustedJobs — retires dead-ended jobs instead of retrying them forever", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves an exhausted stale job to FAILED with a clear reason and refunds the user once", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { refundQuota } = await import("@/lib/quota");
    const { failExhaustedJobs, ATTEMPTS_EXHAUSTED_MESSAGE } = await import("@/lib/evaluationWorker");

    // The real incident row's shape.
    mocked(prisma.evaluation.findMany).mockResolvedValue([
      { id: "cmwb15ye", status: "PROCESSING", userId: "user_1", attempts: 12 },
    ]);
    mocked(prisma.evaluation.updateMany).mockResolvedValue({ count: 1 });

    const retired = await failExhaustedJobs();

    expect(retired).toBe(1);
    const update = mocked(prisma.evaluation.updateMany).mock.calls[0][0];
    // Conditional on the row being exactly as read, so a concurrent sweep
    // can't retire (and refund) it a second time.
    expect(update.where).toEqual({ id: "cmwb15ye", status: "PROCESSING", attempts: 12 });
    expect(update.data.status).toBe("FAILED");
    expect(update.data.lastError).toBe(ATTEMPTS_EXHAUSTED_MESSAGE);
    expect(refundQuota).toHaveBeenCalledTimes(1);
    expect(refundQuota).toHaveBeenCalledWith("user_1", "EVALUATION");
  });

  it("does not refund when another sweep already retired the row", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { refundQuota } = await import("@/lib/quota");
    const { failExhaustedJobs } = await import("@/lib/evaluationWorker");

    mocked(prisma.evaluation.findMany).mockResolvedValue([{ id: "j", status: "PROCESSING", userId: "u", attempts: 3 }]);
    mocked(prisma.evaluation.updateMany).mockResolvedValue({ count: 0 });

    expect(await failExhaustedJobs()).toBe(0);
    expect(refundQuota).not.toHaveBeenCalled();
  });

  it("only considers rows nobody is working on: QUEUED, or PROCESSING past the stale threshold", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { failExhaustedJobs, WORKER_MAX_DURATION_S } = await import("@/lib/evaluationWorker");
    mocked(prisma.evaluation.findMany).mockResolvedValue([]);

    const before = Date.now();
    await failExhaustedJobs();

    const where = mocked(prisma.evaluation.findMany).mock.calls[0][0].where;
    expect(where.attempts).toEqual({ gte: prisma.evaluation.fields.maxAttempts });
    const stale = where.OR.find((c: { status: string }) => c.status === "PROCESSING").startedAt.lt as Date;
    // The stale threshold must exceed the longest a live job can run, or a
    // job still being graded would be retired out from under its worker.
    expect(before - stale.getTime()).toBeGreaterThan(WORKER_MAX_DURATION_S * 1000);
  });
});

describe("runJob — extraction checkpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  const job = {
    id: "eval_ckpt",
    status: "PROCESSING",
    fileUrl: "https://teststore.public.blob.vercel-storage.com/answer-sheets/u1/sheet.pdf",
    fileType: "application/pdf",
    subject: "Chemistry",
    grade: "10th",
    examType: "Unit Test",
    userId: "user_1",
    attempts: 2,
    bypassGradingCache: false,
  };
  const extraction = { questions: [{ questionNumber: 1 }] };
  const graded = {
    result: { totalMarks: 5, obtainedMarks: 3, percentage: 60, questionGrades: [], topicBreakdown: null, overallFeedback: "" },
    extraction,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };

  async function expectedHash() {
    const { computeGradingContentHash } = await import("@/lib/gradingCache");
    const { EXTRACTION_PROMPT_VERSION, GRADE_BATCH_PROMPT_VERSION, MODEL_ID } = await import("@/lib/answerSheetGrading");
    return computeGradingContentHash({
      fileBytes: Buffer.from(new ArrayBuffer(8)),
      subject: job.subject,
      grade: job.grade,
      examType: job.examType,
      modelId: MODEL_ID,
      promptVersion: `${EXTRACTION_PROMPT_VERSION}.${GRADE_BATCH_PROMPT_VERSION}`,
    });
  }

  function setup(prisma: PrismaClient, checkpoint: string | null) {
    mocked(prisma.evaluation.findUnique).mockResolvedValue({ ...job, extractionCheckpoint: checkpoint });
    mocked(prisma.evaluation.update).mockResolvedValue({});
    (global.fetch as unknown) = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  }

  it("logs the stage that actually failed and why, not always \"persist\"", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { logger } = await import("@/lib/logger");
    const { runJob } = await import("@/lib/evaluationWorker");
    setup(prisma as unknown as PrismaClient, null);
    (global.fetch as unknown) = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await runJob(job.id);

    expect(mocked(logger.error).mock.calls[0][1]).toMatchObject({ jobId: job.id, stage: "download", failure: "storage", userId: "user_1" });
  });

  it("resumes at grading when a checkpoint from this exact input exists — no second extraction call", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { gradeAnswerSheetFromFile } = await import("@/lib/answerSheetGrading");
    const { runJob } = await import("@/lib/evaluationWorker");
    setup(prisma, JSON.stringify({ contentHash: await expectedHash(), extraction }));
    mocked(gradeAnswerSheetFromFile).mockResolvedValue(graded);

    await runJob(job.id);

    const checkpointArg = mocked(gradeAnswerSheetFromFile).mock.calls[0][7];
    expect(checkpointArg.extraction).toEqual(extraction);
  });

  it("ignores a checkpoint made from a different input or an older prompt", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { gradeAnswerSheetFromFile } = await import("@/lib/answerSheetGrading");
    const { runJob } = await import("@/lib/evaluationWorker");
    setup(prisma, JSON.stringify({ contentHash: "some-other-input", extraction }));
    mocked(gradeAnswerSheetFromFile).mockResolvedValue(graded);

    await runJob(job.id);

    expect(mocked(gradeAnswerSheetFromFile).mock.calls[0][7].extraction).toBeUndefined();
  });

  it("persists the extraction the moment stage 1 succeeds, then clears it once the job succeeds", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { gradeAnswerSheetFromFile } = await import("@/lib/answerSheetGrading");
    const { runJob } = await import("@/lib/evaluationWorker");
    setup(prisma, null);
    // Simulate the pipeline calling onExtracted before grading.
    mocked(gradeAnswerSheetFromFile).mockImplementation(async (...args: unknown[]) => {
      const cp = args[7] as { onExtracted: (e: unknown) => Promise<void> };
      await cp.onExtracted(extraction);
      return graded;
    });

    await runJob(job.id);

    const writes = mocked(prisma.evaluation.update).mock.calls.map((c) => c[0].data);
    const saved = JSON.parse(writes[0].extractionCheckpoint);
    expect(saved.contentHash).toBe(await expectedHash());
    expect(saved.extraction).toEqual(extraction);
    const final = writes[writes.length - 1];
    expect(final.status).toBe("SUCCEEDED");
    expect(final.extractionCheckpoint).toBeNull();
  });

  it("survives a corrupt checkpoint by extracting again rather than failing the job", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { gradeAnswerSheetFromFile } = await import("@/lib/answerSheetGrading");
    const { runJob } = await import("@/lib/evaluationWorker");
    setup(prisma, "{not json");
    mocked(gradeAnswerSheetFromFile).mockResolvedValue(graded);

    await runJob(job.id);

    expect(mocked(gradeAnswerSheetFromFile).mock.calls[0][7].extraction).toBeUndefined();
    const final = mocked(prisma.evaluation.update).mock.calls.at(-1)![0].data;
    expect(final.status).toBe("SUCCEEDED");
  });
});
