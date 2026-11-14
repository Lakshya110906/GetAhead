import { describe, it, expect } from "vitest";
import { classifyFailure } from "@/lib/geminiErrorPatterns";

// The failure label both background workers log. Named errors first, then
// the same message patterns the retry logic uses.

const named = (name: string, message = "x") => Object.assign(new Error(message), { name });

describe("classifyFailure", () => {
  it.each([
    [named("DailyQuotaExhaustedError"), "daily_quota"],
    [new Error("[429] quotaId GenerateRequestsPerDayPerProjectPerModel-FreeTier"), "daily_quota"],
    [new Error("[429] GenerateRequestsPerMinutePerProjectPerModel"), "rate_limit"],
    [new Error("API key not valid. Please pass a valid API key."), "auth"],
    [named("NotAnAnswerSheetError"), "not_answer_sheet"],
    [named("GradingValidationFailedError"), "validation_failed"],
    [named("PaperValidationFailedError"), "validation_failed"],
    [new Error("Couldn't download the uploaded file (storage returned 404)."), "storage"],
    [new Error("fetch failed"), "transient"],
    [new Error("something new"), "other"],
    ["a string", "other"],
  ])("%s -> %s", (err, expected) => {
    expect(classifyFailure(err)).toBe(expected);
  });
});
