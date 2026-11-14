import { describe, it, expect, vi, beforeEach } from "vitest";

// The 10-12 Nov 2026 504s came from this route awaiting the full grading
// pipeline inside the cron request under a 60s cap. These pin down the
// replacement contract: retire exhausted jobs, claim, RESPOND, and only then
// grade, in after() — so the caller's response time no longer depends on
// how long Gemini takes.

const captured: Array<() => Promise<void>> = [];

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => Promise<void>) => captured.push(fn) };
});
vi.mock("@/lib/evaluationWorker", () => ({
  failExhaustedJobs: vi.fn(),
  claimNextJob: vi.fn(),
  runJob: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const mocked = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

function req(auth?: string) {
  return { headers: { get: (k: string) => (k.toLowerCase() === "authorization" ? (auth ?? null) : null) } } as never;
}

describe("GET /api/cron/sweep-evaluations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.length = 0;
    process.env.CRON_SECRET = "test-secret";
  });

  it("responds before any grading runs, then grades the claimed jobs in after()", async () => {
    const worker = await import("@/lib/evaluationWorker");
    mocked(worker.failExhaustedJobs).mockResolvedValue(1);
    mocked(worker.claimNextJob).mockResolvedValueOnce("job_a").mockResolvedValueOnce("job_b");
    mocked(worker.runJob).mockResolvedValue(undefined);
    const { GET } = await import("@/app/api/cron/sweep-evaluations/route");

    const res = await GET(req("Bearer test-secret"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, retired: 1, claimed: 2 });
    // Nothing graded yet: the response did not wait on it.
    expect(worker.runJob).not.toHaveBeenCalled();

    expect(captured).toHaveLength(1);
    await captured[0]();
    expect(mocked(worker.runJob).mock.calls.map((c) => c[0])).toEqual(["job_a", "job_b"]);
  });

  it("one job throwing does not strand the next", async () => {
    const worker = await import("@/lib/evaluationWorker");
    mocked(worker.failExhaustedJobs).mockResolvedValue(0);
    mocked(worker.claimNextJob).mockResolvedValueOnce("bad").mockResolvedValueOnce("good");
    mocked(worker.runJob).mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(undefined);
    const { GET } = await import("@/app/api/cron/sweep-evaluations/route");

    await GET(req("Bearer test-secret"));
    await captured[0]();

    expect(mocked(worker.runJob).mock.calls.map((c) => c[0])).toEqual(["bad", "good"]);
  });

  it("schedules nothing when there is nothing to do", async () => {
    const worker = await import("@/lib/evaluationWorker");
    mocked(worker.failExhaustedJobs).mockResolvedValue(0);
    mocked(worker.claimNextJob).mockResolvedValue(null);
    const { GET } = await import("@/app/api/cron/sweep-evaluations/route");

    const res = await GET(req("Bearer test-secret"));

    expect(await res.json()).toEqual({ ok: true, retired: 0, claimed: 0 });
    expect(captured).toHaveLength(0);
  });

  it("fails closed: wrong secret, missing header, or no CRON_SECRET configured", async () => {
    const worker = await import("@/lib/evaluationWorker");
    const { GET } = await import("@/app/api/cron/sweep-evaluations/route");

    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect((await GET(req())).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
    expect(worker.claimNextJob).not.toHaveBeenCalled();
  });

  it("runs under the platform's 300s budget, not the old self-imposed 60s", async () => {
    const route = await import("@/app/api/cron/sweep-evaluations/route");
    const { WORKER_MAX_DURATION_S } = await vi.importActual<typeof import("@/lib/evaluationWorker")>("@/lib/evaluationWorker");
    expect(route.maxDuration).toBe(300);
    expect(route.maxDuration).toBe(WORKER_MAX_DURATION_S);
  });
});
