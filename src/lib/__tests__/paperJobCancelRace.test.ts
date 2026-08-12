import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression test: every write in processJobStep() is a plain update-by-id
// with no status guard. A real Gemini call sits between reading the job row
// and persisting its result — long enough for DELETE /api/papers/[id]
// (cancel) to land in between. Without a re-check, the write after an
// in-flight call completes would silently resurrect an already-cancelled
// job. Reproduces that race directly: the planner call "succeeds" after the
// job has already been cancelled underneath it.

vi.mock("@/lib/prisma", () => ({
  prisma: { paperGenerationJob: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/quota", () => ({ refundQuota: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/errorTracking", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/question-agents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/question-agents")>();
  return {
    ...actual,
    isGeminiConfigured: vi.fn(() => true),
    getGenAI: vi.fn(() => ({})),
    runPlannerAgent: vi.fn(async () => ({ sections: [{ title: "Section A", questionType: "Short", questionCount: 1, marksPerQuestion: 10, subtopics: ["x"] }] })),
  };
});

describe("paperJob.ts — cancel racing an in-flight Gemini call", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not persist a step transition if the job was cancelled while the planner call was in flight", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { processJobStep } = await import("@/lib/paperJob");

    const baseJob = {
      id: "job_race",
      status: "running",
      step: "planner",
      lockedAt: null,
      attemptCount: 0,
      updatedAt: new Date(),
      config: JSON.stringify({ subject: "Math", grade: "10th", topic: "algebra", difficulty: "Medium", totalMarks: 10, questionTypes: ["Short Answer"] }),
      agentStates: JSON.stringify({ planner: { status: "queued" }, generator: { status: "queued" }, reviewer: { status: "queued" } }),
      plannerPlan: null,
      draftPaper: null,
      repairAttempts: null,
      validationAttempt: 0,
      userId: "user_1",
    };

    const findUniqueMock = prisma.paperGenerationJob.findUnique as ReturnType<typeof vi.fn>;
    // 1st call: the initial read at the top of processJobStep (job is still running).
    // 2nd call: isCancelled()'s check AFTER the planner call resolves — the
    // user cancelled while it was in flight.
    findUniqueMock
      .mockResolvedValueOnce(baseJob)
      .mockResolvedValueOnce({ status: "cancelled" });
    (prisma.paperGenerationJob.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await processJobStep("job_race");

    const updateCalls = (prisma.paperGenerationJob.update as ReturnType<typeof vi.fn>).mock.calls;
    // The "claim the lock" and "planner running" writes both happen BEFORE
    // the planner call (and therefore before the cancel lands), so they're
    // expected. What must never happen is a write transitioning step to
    // "generator" — persisting the planner's result and moving the job
    // forward would resurrect the cancellation the user asked for.
    expect(updateCalls.some((c) => c[0].data.step === "generator")).toBe(false);
    expect(updateCalls.some((c) => c[0].data.plannerPlan)).toBe(false);
  });
});
