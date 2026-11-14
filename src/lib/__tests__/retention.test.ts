import { describe, it, expect, vi, beforeEach } from "vitest";

// Retention rules and the orphan-upload reaper. The windows must stay longer
// than what reads each table needs, and nothing outside the app's own upload
// folder, or still referenced by an evaluation, may ever be reaped.

vi.mock("@/lib/prisma", () => {
  const dm = () => vi.fn().mockResolvedValue({ count: 0 });
  return {
    prisma: {
      errorLog: { deleteMany: dm() },
      auditLog: { deleteMany: dm() },
      supportTicket: { deleteMany: dm() },
      geminiCallLog: { deleteMany: dm() },
      usageCounter: { deleteMany: dm() },
      rateLimit: { deleteMany: dm() },
      systemSetting: { findMany: vi.fn().mockResolvedValue([]), deleteMany: dm() },
      evaluation: { findMany: vi.fn().mockResolvedValue([]) },
      $executeRaw: vi.fn().mockResolvedValue(0),
    },
  };
});
vi.mock("@vercel/blob", () => ({ list: vi.fn(), del: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const mocked = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const NOW = new Date("2026-11-14T12:00:00.000Z");
const DAY = 86_400_000;

describe("purgeExpiredData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("applies each documented window, measured from now", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { purgeExpiredData } = await import("@/lib/retention");
    await purgeExpiredData(NOW);

    const cutoff = (fn: unknown, path: string[]) =>
      path.reduce<any>((o, k) => o[k], mocked(fn).mock.calls[0][0].where) as Date; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(cutoff(prisma.errorLog.deleteMany, ["createdAt", "lt"]).getTime()).toBe(NOW.getTime() - 30 * DAY);
    expect(cutoff(prisma.auditLog.deleteMany, ["createdAt", "lt"]).getTime()).toBe(NOW.getTime() - 365 * DAY);
    expect(cutoff(prisma.geminiCallLog.deleteMany, ["createdAt", "lt"]).getTime()).toBe(NOW.getTime() - 90 * DAY);
    expect(cutoff(prisma.rateLimit.deleteMany, ["resetAt", "lt"]).getTime()).toBe(NOW.getTime() - 60 * 60 * 1000);
    // UsageCounter.date is a "YYYY-MM-DD" string: 7 days before 14 Nov.
    expect(mocked(prisma.usageCounter.deleteMany).mock.calls[0][0].where).toEqual({ date: { lt: "2026-11-07" } });
  });

  it("keeps the quota gate's data: the GeminiCallLog window is far longer than the 24h the gate reads", async () => {
    const { RETENTION } = await import("@/lib/retention");
    expect(RETENTION.geminiCallLogDays).toBeGreaterThan(1);
    expect(RETENTION.usageCounterDays).toBeGreaterThan(1);
  });

  it("deletes only dated alert-dedupe keys older than the window, never real settings or cron records", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { purgeExpiredData } = await import("@/lib/retention");
    mocked(prisma.systemSetting.findMany).mockResolvedValue([
      { key: "maintenanceMode" },
      { key: "cron:lastRun:sweep-evaluations" },
      { key: "queue-stuck-alert:2026-11-13" }, // recent: kept
      { key: "queue-stuck-alert:2026-10-01" }, // old: deleted
      { key: "spend-alert:2026-09-30" }, // old: deleted
    ]);
    mocked(prisma.systemSetting.deleteMany).mockResolvedValue({ count: 2 });

    const res = await purgeExpiredData(NOW);

    expect(mocked(prisma.systemSetting.deleteMany).mock.calls[0][0].where.key.in.sort()).toEqual([
      "queue-stuck-alert:2026-10-01",
      "spend-alert:2026-09-30",
    ]);
    expect(res.alertDedupeKeys).toBe(2);
  });

  it("only removes cache rows that no evaluation references and that are past the write-race window", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { purgeExpiredData } = await import("@/lib/retention");
    await purgeExpiredData(NOW);

    const [strings, ageCutoff] = mocked(prisma.$executeRaw).mock.calls[0] as [TemplateStringsArray, Date];
    const sql = strings.join("?");
    expect(sql).toMatch(/LEFT JOIN Evaluation e ON e\.contentHash = g\.contentHash/);
    expect(sql).toMatch(/WHERE e\.id IS NULL/);
    expect(ageCutoff.getTime()).toBe(NOW.getTime() - 24 * 60 * 60 * 1000);
  });
});

describe("reapOrphanUploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = "test";
  });

  const old = new Date(NOW.getTime() - 3 * DAY);
  const fresh = new Date(NOW.getTime() - 60 * 60 * 1000);

  it("lists only the app's own upload folder", async () => {
    const blob = await import("@vercel/blob");
    const { reapOrphanUploads } = await import("@/lib/blobCleanup");
    mocked(blob.list).mockResolvedValue({ blobs: [], hasMore: false });

    await reapOrphanUploads(NOW);

    expect(mocked(blob.list).mock.calls[0][0].prefix).toBe("answer-sheets/");
  });

  it("deletes an old upload nothing references, and leaves referenced and recent ones alone", async () => {
    const blob = await import("@vercel/blob");
    const { prisma } = await import("@/lib/prisma");
    const { reapOrphanUploads } = await import("@/lib/blobCleanup");
    mocked(blob.list).mockResolvedValue({
      hasMore: false,
      blobs: [
        { url: "https://b/answer-sheets/u1/orphan.pdf", pathname: "answer-sheets/u1/orphan.pdf", uploadedAt: old },
        { url: "https://b/answer-sheets/u1/kept-by-url.pdf", pathname: "answer-sheets/u1/kept-by-url.pdf", uploadedAt: old },
        { url: "https://b/answer-sheets/u1/kept-by-key.pdf", pathname: "answer-sheets/u1/kept-by-key.pdf", uploadedAt: old },
        { url: "https://b/answer-sheets/u1/in-flight.pdf", pathname: "answer-sheets/u1/in-flight.pdf", uploadedAt: fresh },
      ],
    });
    mocked(prisma.evaluation.findMany).mockResolvedValue([
      { fileUrl: "https://b/answer-sheets/u1/kept-by-url.pdf", fileKey: null },
      { fileUrl: null, fileKey: "answer-sheets/u1/kept-by-key.pdf" },
    ]);
    mocked(blob.del).mockResolvedValue(undefined);

    const res = await reapOrphanUploads(NOW);

    expect(mocked(blob.del).mock.calls[0][0]).toEqual(["https://b/answer-sheets/u1/orphan.pdf"]);
    expect(res).toEqual({ found: 1, deleted: 1 });
  });

  it("does nothing without a Blob token rather than throwing", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const blob = await import("@vercel/blob");
    const { reapOrphanUploads } = await import("@/lib/blobCleanup");
    expect(await reapOrphanUploads(NOW)).toEqual({ found: 0, deleted: 0 });
    expect(blob.list).not.toHaveBeenCalled();
  });
});
