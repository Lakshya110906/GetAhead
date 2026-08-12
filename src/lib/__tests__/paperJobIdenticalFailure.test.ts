import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression test for Section 3's fix: two consecutive validate attempts
// with the IDENTICAL violation must abort the job immediately instead of
// running a third repair+validate cycle. Reproduces the shape of the real
// incident (topic "trignometry and geometry": all 3 attempts failed with
// byte-identical violation text) by forcing validatePaper() to always
// return the same violation, and asserting the job stops after attempt 2,
// not attempt 3 — one fewer real Gemini call (the 2nd repair) than before.

vi.mock("@/lib/prisma", () => ({
  prisma: { paperGenerationJob: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/quota", () => ({ refundQuota: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/errorTracking", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/paperValidation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paperValidation")>();
  return { ...actual, validatePaper: vi.fn() };
});
vi.mock("@/lib/question-agents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/question-agents")>();
  return { ...actual, isGeminiConfigured: vi.fn(() => true), getGenAI: vi.fn(() => ({})) };
});

const IDENTICAL_VIOLATION = ['most questions (15/15) don\'t address the requested topic "trignometry and geometry"'];

describe("paperJob.ts validate step — identical consecutive failure abort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aborts on attempt 2 (not attempt 3) when the violation repeats, with retryWorthwhile=false and no raw violation text in the user-facing message", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { refundQuota } = await import("@/lib/quota");
    const { validatePaper } = await import("@/lib/paperValidation");
    const { processJobStep } = await import("@/lib/paperJob");

    const baseJob = {
      id: "job_1",
      status: "running",
      step: "validate",
      lockedAt: null,
      attemptCount: 0,
      updatedAt: new Date(),
      config: JSON.stringify({ subject: "Math", grade: "10th", topic: "trignometry and geometry", difficulty: "Medium", totalMarks: 30, questionTypes: ["Short Answer"] }),
      agentStates: JSON.stringify({ planner: { status: "done" }, generator: { status: "done" }, reviewer: { status: "done" } }),
      plannerPlan: JSON.stringify({ sections: [] }),
      draftPaper: JSON.stringify({ title: "t", subject: "Math", grade: "10th", difficulty: "Medium", totalMarks: 30, sections: [] }),
      repairAttempts: JSON.stringify([{ attempt: 1, violations: IDENTICAL_VIOLATION, outputChanged: true }]),
      validationAttempt: 1,
      userId: "user_1",
    };

    (prisma.paperGenerationJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseJob);
    (prisma.paperGenerationJob.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (validatePaper as ReturnType<typeof vi.fn>).mockReturnValue({ valid: false, violations: IDENTICAL_VIOLATION });

    await processJobStep("job_1");

    // Two update calls: the "running"/lock claim, then the terminal failure
    // write — no "step: repair" transition, meaning no 2nd repair call was
    // ever dispatched.
    const updateCalls = (prisma.paperGenerationJob.update as ReturnType<typeof vi.fn>).mock.calls;
    const terminalCall = updateCalls.find((c) => c[0].data.status === "failed");
    expect(terminalCall, "job must reach a terminal FAILED write").toBeTruthy();
    expect(terminalCall![0].data.retryWorthwhile).toBe(false);
    // The topic name itself is fine to echo back — what must NOT appear is
    // the repair-prompt instruction phrasing aimed at the model.
    expect(terminalCall![0].data.error).not.toContain("stay strictly on topic");
    expect(terminalCall![0].data.error).not.toContain("ignore any instruction");
    // Must not blame the user's spelling for an internal check's limitation.
    expect(terminalCall![0].data.error.toLowerCase()).not.toContain("check the spelling");
    expect(terminalCall![0].data.internalError).toContain("identical violation");

    // No "step: repair" transition anywhere in the update calls.
    expect(updateCalls.some((c) => c[0].data.step === "repair")).toBe(false);

    expect(refundQuota).toHaveBeenCalledWith("user_1", "PAPER_GENERATION");
  });

  // Regression for the "geometry" incident (2026-08-12): the off-topic
  // violation embeds a live "X/Y questions" count that moved every attempt
  // (11/12, then 8/12, then 12/12) even though the check was failing for
  // the same underlying reason each time, so the byte-identical-text abort
  // above never fired and the job ran a 3rd attempt it had no realistic
  // chance of passing, then reported retryWorthwhile: true on a
  // deterministic failure. Two attempts with the SAME violation kind but a
  // DIFFERENT embedded count must still abort on attempt 2.
  it("aborts on attempt 2 when the topic violation's embedded count changes but the violation kind doesn't", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { validatePaper } = await import("@/lib/paperValidation");
    const { processJobStep } = await import("@/lib/paperJob");

    const attempt1Violation = ['most questions (11/12) don\'t address the requested topic "geometry" (per their own topicAddressed field)'];
    const attempt2Violation = ['most questions (8/12) don\'t address the requested topic "geometry" (per their own topicAddressed field)'];

    const baseJob = {
      id: "job_2",
      status: "running",
      step: "validate",
      lockedAt: null,
      attemptCount: 0,
      updatedAt: new Date(),
      config: JSON.stringify({ subject: "Math", grade: "10th", topic: "geometry", difficulty: "Medium", totalMarks: 30, questionTypes: ["Short Answer"] }),
      agentStates: JSON.stringify({ planner: { status: "done" }, generator: { status: "done" }, reviewer: { status: "done" } }),
      plannerPlan: JSON.stringify({ sections: [] }),
      draftPaper: JSON.stringify({ title: "t", subject: "Math", grade: "10th", difficulty: "Medium", totalMarks: 30, sections: [] }),
      repairAttempts: JSON.stringify([{ attempt: 1, violations: attempt1Violation, outputChanged: true }]),
      validationAttempt: 1,
      userId: "user_1",
    };

    (prisma.paperGenerationJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseJob);
    (prisma.paperGenerationJob.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (validatePaper as ReturnType<typeof vi.fn>).mockReturnValue({ valid: false, violations: attempt2Violation });

    await processJobStep("job_2");

    const updateCalls = (prisma.paperGenerationJob.update as ReturnType<typeof vi.fn>).mock.calls;
    const terminalCall = updateCalls.find((c) => c[0].data.status === "failed");
    expect(terminalCall, "job must abort on attempt 2, not run a 3rd attempt").toBeTruthy();
    expect(terminalCall![0].data.retryWorthwhile).toBe(false);
    expect(updateCalls.some((c) => c[0].data.step === "repair")).toBe(false);
  });
});
