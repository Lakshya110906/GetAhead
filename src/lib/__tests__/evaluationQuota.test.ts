import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry, DailyQuotaExhaustedError, GeminiRateLimitError, GeminiAuthError, GeminiInvalidArgumentError } from "@/lib/question-agents";

// ── RPD vs RPM vs auth vs invalid-argument classification ──────────────────
// Regression coverage for the bug identified this session: DAILY_QUOTA_PATTERN
// used to include the generic "exceeded your current quota" phrase, which
// Google's error body uses for BOTH daily and per-minute limits — so a
// genuinely transient per-minute rate limit could be misclassified as an
// unrecoverable daily exhaustion (or vice versa). Classification must now key
// off the specific PerDay/PerMinute quotaId markers instead.
describe("Gemini error classification (withRetry)", () => {
  const RPD_MESSAGE = '[GoogleGenerativeAI Error]: ... "quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier" ... exceeded your current quota ...';
  const RPM_MESSAGE = '[GoogleGenerativeAI Error]: ... "quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier" ... exceeded your current quota ...';
  const AUTH_MESSAGE = "[GoogleGenerativeAI Error]: API key not valid. Please pass a valid API key.";
  const INVALID_ARG_MESSAGE = "[GoogleGenerativeAI Error]: 400 Bad Request — INVALID_ARGUMENT: request body is malformed";
  const AMBIGUOUS_QUOTA_MESSAGE = "[GoogleGenerativeAI Error]: 429 — you exceeded your current quota, please check your plan and billing details";

  it("classifies a daily-quota (RPD) message as DailyQuotaExhaustedError — not retryable", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new Error(RPD_MESSAGE);
    };
    await expect(withRetry(fn, "Extraction", 1)).rejects.toThrow(DailyQuotaExhaustedError);
    expect(calls).toBe(1);
  });

  it("classifies a per-minute (RPM) message as GeminiRateLimitError — distinct from daily", async () => {
    const fn = async () => {
      throw new Error(RPM_MESSAGE);
    };
    const err = await withRetry(fn, "Grading", 1).catch((e) => e);
    expect(err).toBeInstanceOf(GeminiRateLimitError);
    expect(err).not.toBeInstanceOf(DailyQuotaExhaustedError);
  });

  it("does NOT misclassify an RPM message as daily-quota just because both mention 'exceeded your current quota'", async () => {
    const fn = async () => {
      throw new Error(RPM_MESSAGE);
    };
    await expect(withRetry(fn, "Grading", 1)).rejects.not.toThrow(DailyQuotaExhaustedError);
  });

  it("treats an ambiguous quota message (no PerDay/PerMinute marker) as non-retryable, never assumed transient", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new Error(AMBIGUOUS_QUOTA_MESSAGE);
    };
    // Not classified as DailyQuotaExhaustedError (no PerDay marker) and not
    // retried either (ambiguous quota text isn't in RETRYABLE_ERROR_PATTERN) —
    // it surfaces as the original error, on the first and only attempt.
    await expect(withRetry(fn, "Grading", 3)).rejects.toThrow(AMBIGUOUS_QUOTA_MESSAGE);
    expect(calls).toBe(1);
  });

  it("classifies an auth failure as GeminiAuthError — not retryable", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new Error(AUTH_MESSAGE);
    };
    await expect(withRetry(fn, "Extraction", 3)).rejects.toThrow(GeminiAuthError);
    expect(calls).toBe(1);
  });

  it("classifies an invalid-argument failure as GeminiInvalidArgumentError — not retryable", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new Error(INVALID_ARG_MESSAGE);
    };
    await expect(withRetry(fn, "Grading", 3)).rejects.toThrow(GeminiInvalidArgumentError);
    expect(calls).toBe(1);
  });
});

// ── evaluationWorker.ts: quota parity with paperJob.ts ──────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/quota", () => ({
  refundQuota: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/errorTracking", () => ({
  captureException: vi.fn(),
}));
vi.mock("@/lib/answerSheetGrading", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/answerSheetGrading")>();
  return { ...actual, gradeAnswerSheetFromFile: vi.fn() };
});

describe("evaluationWorker.ts — quota failure handling (parity with paperJob.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails fast, refunds once, and surfaces the daily-quota message on a simulated RPD failure — one call, zero retries", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { refundQuota } = await import("@/lib/quota");
    const { gradeAnswerSheetFromFile } = await import("@/lib/answerSheetGrading");
    const { processSpecificJob } = await import("@/lib/evaluationWorker");

    const job = {
      id: "eval_1",
      status: "PROCESSING",
      fileUrl: "https://example.test/sheet.pdf",
      fileType: "application/pdf",
      subject: "Chemistry",
      grade: "10th",
      examType: "Board",
      userId: "user_1",
      attempts: 1,
    };

    (prisma.evaluation.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (prisma.evaluation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(job);
    (prisma.evaluation.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (global.fetch as unknown) = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });

    // Simulates what extractAnswerSheet() actually throws after its own
    // withRetry() classification (see answerSheetGrading.ts) — a real daily
    // 429 never reaches evaluationWorker.ts as a raw message, it's already
    // converted to DailyQuotaExhaustedError by the time it propagates here.
    let callCount = 0;
    (gradeAnswerSheetFromFile as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      throw new DailyQuotaExhaustedError("Answer sheet extraction");
    });

    await processSpecificJob(job.id);

    // One call attempted, zero retries — no requeue loop left to burn more.
    expect(callCount).toBe(1);

    // Terminal FAILED write, with a message that specifically names the
    // daily limit (not a generic "try again" message).
    const updateCall = (prisma.evaluation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.status).toBe("FAILED");
    expect(updateCall.data.lastError).toMatch(/daily/i);
    expect(updateCall.data.lastError).not.toMatch(/QUEUED|nextAttemptAt/i);

    // No requeue: update was called exactly once (the terminal FAILED write),
    // never a QUEUED-with-backoff write.
    expect((prisma.evaluation.update as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);

    // Credit refunded — the exact parity gap this fix closes.
    expect(refundQuota).toHaveBeenCalledTimes(1);
    expect(refundQuota).toHaveBeenCalledWith("user_1", "EVALUATION");
  });
});
