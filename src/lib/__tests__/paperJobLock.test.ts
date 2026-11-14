import { describe, it, expect, vi, beforeEach } from "vitest";

// processJobStep's lock was a read followed by a separate update, and went
// stale after 20s while real steps run 17s on average and up to 53s
// (GeminiCallLog). The client calls /advance on every 2s poll, so a step
// past 20s could be started a second time mid-flight. And a step killed by
// a timeout never reached the catch block that counts failed attempts, so
// it could be retried forever. These pin down the fix.

vi.mock("@/lib/prisma", () => ({
  prisma: { paperGenerationJob: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() } },
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
    runPlannerAgent: vi.fn(async () => ({ sections: [] })),
  };
});

const mocked = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const baseJob = {
  id: "job_1",
  status: "running",
  step: "planner",
  lockedAt: null as Date | null,
  attemptCount: 0,
  updatedAt: new Date(Date.now() - 10 * 60_000),
  config: JSON.stringify({ subject: "Math", grade: "10th", topic: "algebra", difficulty: "Medium", totalMarks: 10, questionTypes: ["Short Answer"] }),
  agentStates: JSON.stringify({ planner: { status: "queued" }, generator: { status: "queued" }, reviewer: { status: "queued" } }),
  plannerPlan: null,
  draftPaper: null,
  repairAttempts: null,
  validationAttempt: 0,
  userId: "user_1",
};

describe("processJobStep — lock and retry cap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("takes the lock in one conditional write that also counts the attempt", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { processJobStep, LOCK_STALE_MS } = await import("@/lib/paperJob");
    mocked(prisma.paperGenerationJob.findUnique).mockResolvedValue({ ...baseJob });
    mocked(prisma.paperGenerationJob.updateMany).mockResolvedValue({ count: 1 });
    mocked(prisma.paperGenerationJob.update).mockResolvedValue({});

    await processJobStep("job_1");

    const acquire = mocked(prisma.paperGenerationJob.updateMany).mock.calls[0][0];
    // Only wins if the row is still exactly as read: same step, same attempt
    // count, and not held by a live lock.
    expect(acquire.where.step).toBe("planner");
    expect(acquire.where.attemptCount).toBe(0);
    expect(acquire.where.OR).toEqual([{ lockedAt: null }, { lockedAt: { lt: expect.any(Date) } }]);
    expect(acquire.data.attemptCount).toEqual({ increment: 1 });
    expect(LOCK_STALE_MS).toBeGreaterThan(53_000); // longest step observed in production
  });

  it("does no model work when another caller won the lock", async () => {
    const { prisma } = await import("@/lib/prisma");
    const agents = await import("@/lib/question-agents");
    const { processJobStep } = await import("@/lib/paperJob");
    mocked(prisma.paperGenerationJob.findUnique).mockResolvedValue({ ...baseJob });
    mocked(prisma.paperGenerationJob.updateMany).mockResolvedValue({ count: 0 });

    await processJobStep("job_1");

    expect(agents.runPlannerAgent).not.toHaveBeenCalled();
    expect(prisma.paperGenerationJob.update).not.toHaveBeenCalled();
  });

  it("retires a step whose every attempt was killed before it could fail normally, and refunds once", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { refundQuota } = await import("@/lib/quota");
    const agents = await import("@/lib/question-agents");
    const { processJobStep } = await import("@/lib/paperJob");
    // Three started attempts, none reached the catch block (timeouts), lock long stale.
    mocked(prisma.paperGenerationJob.findUnique).mockResolvedValue({
      ...baseJob,
      attemptCount: 3,
      lockedAt: new Date(Date.now() - 10 * 60_000),
    });
    mocked(prisma.paperGenerationJob.updateMany).mockResolvedValue({ count: 1 });

    await processJobStep("job_1");

    const retire = mocked(prisma.paperGenerationJob.updateMany).mock.calls[0][0];
    expect(retire.data.status).toBe("failed");
    expect(agents.runPlannerAgent).not.toHaveBeenCalled();
    expect(refundQuota).toHaveBeenCalledTimes(1);
    expect(refundQuota).toHaveBeenCalledWith("user_1", "PAPER_GENERATION");
  });

  it("leaves a step with a live lock alone", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { processJobStep } = await import("@/lib/paperJob");
    mocked(prisma.paperGenerationJob.findUnique).mockResolvedValue({ ...baseJob, lockedAt: new Date() });

    await processJobStep("job_1");

    expect(prisma.paperGenerationJob.updateMany).not.toHaveBeenCalled();
  });
});
