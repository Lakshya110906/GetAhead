import { describe, it, expect, vi, beforeEach } from "vitest";

// queue-alert used to fire only above 20 queued jobs, in an app with 9
// evaluations ever. During the 10-12 Nov 2026 incident two jobs were stuck
// (depth 2) and it would have stayed silent. It now reports stuck work.

vi.mock("@/lib/prisma", () => ({
  prisma: { evaluation: { count: vi.fn() }, paperGenerationJob: { count: vi.fn() } },
}));
vi.mock("@/lib/alerts", () => ({ alertOncePerDay: vi.fn(), isAlertEmailConfigured: vi.fn(() => false) }));
vi.mock("@/lib/cronRuns", () => ({ recordCronRun: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/evaluationWorker", () => ({
  STALE_PROCESSING_MS: 360_000,
  ATTEMPTS_EXHAUSTED_MESSAGE: "exhausted",
}));

const mocked = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const req = (auth: string | null) => ({ headers: { get: () => auth } }) as never;

// Order of counts in the route: depth, stuckProcessing, overdueQueued, (papers), retiredLast24h.
async function setCounts(evalCounts: number[], papers: number) {
  const { prisma } = await import("@/lib/prisma");
  const c = mocked(prisma.evaluation.count);
  evalCounts.forEach((n) => c.mockResolvedValueOnce(n));
  mocked(prisma.paperGenerationJob.count).mockResolvedValueOnce(papers);
}

describe("GET /api/cron/queue-alert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s";
  });

  it("alerts on the November incident's shape: depth 2, both stuck", async () => {
    await setCounts([2, 2, 0, 0], 0);
    const { alertOncePerDay } = await import("@/lib/alerts");
    const { GET } = await import("@/app/api/cron/queue-alert/route");

    const body = await (await GET(req("Bearer s"))).json();

    expect(body.stuck).toBe(2);
    expect(body.alerting).toBe(true);
    expect(alertOncePerDay).toHaveBeenCalledTimes(1);
    // Says plainly that email can't go out, instead of implying it did.
    expect(body.emailConfigured).toBe(false);
  });

  it("counts a stalled paper job as stuck", async () => {
    await setCounts([0, 0, 0, 0], 1);
    const { GET } = await import("@/app/api/cron/queue-alert/route");
    const body = await (await GET(req("Bearer s"))).json();
    expect(body.stuck).toBe(1);
  });

  it("is quiet when nothing is stuck, but still records the run", async () => {
    await setCounts([0, 0, 0, 1], 0);
    const { alertOncePerDay } = await import("@/lib/alerts");
    const { recordCronRun } = await import("@/lib/cronRuns");
    const { GET } = await import("@/app/api/cron/queue-alert/route");

    const body = await (await GET(req("Bearer s"))).json();

    expect(body).toMatchObject({ stuck: 0, alerting: false, retiredLast24h: 1 });
    expect(alertOncePerDay).not.toHaveBeenCalled();
    expect(recordCronRun).toHaveBeenCalledWith("queue-alert", true, expect.objectContaining({ stuck: 0 }));
  });

  it("fails closed without the right secret", async () => {
    const { GET } = await import("@/app/api/cron/queue-alert/route");
    expect((await GET(req("Bearer nope"))).status).toBe(401);
    expect((await GET(req(null))).status).toBe(401);
  });
});
