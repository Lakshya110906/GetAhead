import { describe, it, expect } from "vitest";
import { withRetry, DailyQuotaExhaustedError } from "@/lib/question-agents";

// Regression test for a real bug found live this session: paperJob.ts's
// step-processor called the raw runXAgent() functions directly, bypassing
// withRetry() entirely — so a daily-quota 429 was never classified as
// DailyQuotaExhaustedError, never fast-failed, and never refunded; it just
// looked like a generic transient error to the job's own retry/backoff
// logic. Confirmed live: a real job failed with quotaRefunded: false before
// this fix, and quotaRefunded: true / retryWorthwhile: false in under 2s
// after wrapping each agent call in withRetry(..., 1).
describe("withRetry with attempts=1 (the paperJob.ts usage)", () => {
  it("still classifies a daily-quota error and throws DailyQuotaExhaustedError on the very first attempt", async () => {
    const fn = async () => {
      throw new Error(
        '[GoogleGenerativeAI Error]: ... "quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier" ...'
      );
    };
    await expect(withRetry(fn, "Planner Agent", 1)).rejects.toThrow(DailyQuotaExhaustedError);
  });

  it("does not retry a non-quota error when attempts=1 — fails immediately, deferring to the caller's own retry logic", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new Error("some transient network error");
    };
    await expect(withRetry(fn, "Generator Agent", 1)).rejects.toThrow("some transient network error");
    expect(calls).toBe(1);
  });

  it("resolves normally when the call succeeds", async () => {
    const result = await withRetry(async () => "ok", "Reviewer Agent", 1);
    expect(result).toBe("ok");
  });
});
