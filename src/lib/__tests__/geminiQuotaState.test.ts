import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { geminiCallLog: { count: vi.fn() } },
}));

describe("geminiQuotaState — simulated near-limit states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports level 'ok' well under the warn threshold", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getModelUsageToday } = await import("@/lib/geminiQuotaState");
    (prisma.geminiCallLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(5); // 5/20 = 25%

    const usage = await getModelUsageToday("gemini-2.5-flash");
    expect(usage.used).toBe(5);
    expect(usage.limit).toBe(20);
    expect(usage.remaining).toBe(15);
    expect(usage.level).toBe("ok");
  });

  it("reports level 'warn' at exactly 80% used", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getModelUsageToday } = await import("@/lib/geminiQuotaState");
    (prisma.geminiCallLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(16); // 16/20 = 80%

    const usage = await getModelUsageToday("gemini-2.5-flash");
    expect(usage.level).toBe("warn");
  });

  it("reports level 'block' at 95% used, and assertQuotaHeadroom throws with specifics", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getModelUsageToday, assertQuotaHeadroom, QuotaHeadroomError } = await import("@/lib/geminiQuotaState");
    (prisma.geminiCallLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(19); // 19/20 = 95%

    const usage = await getModelUsageToday("gemini-2.5-flash");
    expect(usage.level).toBe("block");
    expect(usage.remaining).toBe(1);

    let caught: unknown;
    try {
      await assertQuotaHeadroom("gemini-2.5-flash", 3);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(QuotaHeadroomError);
    const err = caught as InstanceType<typeof QuotaHeadroomError>;
    // Message must name specifics: how many remain, how many are needed, and a reset time.
    expect(err.message).toContain("1 of 20");
    expect(err.message).toContain("needs up to 3");
    expect(err.message).toMatch(/resets at/i);
  });

  it("blocks a new operation whose own request need exceeds remaining headroom, even below the 95% threshold", async () => {
    // 18/20 = 90% — under the block threshold by itself, but only 2 remain
    // and this operation needs 5: starting it would guarantee a partial
    // failure mid-operation, so it must fail BEFORE starting, not during.
    const { prisma } = await import("@/lib/prisma");
    const { assertQuotaHeadroom, QuotaHeadroomError } = await import("@/lib/geminiQuotaState");
    (prisma.geminiCallLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(18);

    await expect(assertQuotaHeadroom("gemini-2.5-flash", 5)).rejects.toThrow(QuotaHeadroomError);
  });

  it("allows an operation whose request need fits comfortably within remaining headroom", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { assertQuotaHeadroom } = await import("@/lib/geminiQuotaState");
    (prisma.geminiCallLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(2); // 2/20 = 10%

    const usage = await assertQuotaHeadroom("gemini-2.5-flash", 3);
    expect(usage.level).toBe("ok");
  });

  it("excludes rows already rejected for daily_quota/rate_limit from the used count (they never consumed a real request)", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getModelUsageToday } = await import("@/lib/geminiQuotaState");
    const countMock = prisma.geminiCallLog.count as ReturnType<typeof vi.fn>;
    countMock.mockResolvedValue(3);

    await getModelUsageToday("gemini-2.5-flash");
    const whereArg = countMock.mock.calls[0][0].where;
    // A bare `NOT: { errorType: { in: [...] } }` is a real bug, not a style
    // choice: SQL's three-valued logic makes `NULL NOT IN (...)` evaluate
    // to NULL, not TRUE, silently dropping every successful row
    // (errorType IS NULL) from the count along with the ones actually
    // meant to be excluded. Confirmed live against the real table: 18
    // successful calls existed in the current window and the buggy query
    // counted 0 of them. The query must explicitly include null rows.
    expect(whereArg.OR).toEqual([
      { errorType: null },
      { NOT: { errorType: { in: ["daily_quota", "rate_limit"] } } },
    ]);
    expect(whereArg.replayed).toBe(false);
  });
});

describe("geminiQuotaState — unseparated Preview deployment guard", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("blocks real Gemini calls on a Preview deployment even with plenty of quota remaining", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { assertQuotaHeadroom, PreviewEnvironmentBlockedError } = await import("@/lib/geminiQuotaState");
    (prisma.geminiCallLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(0); // plenty of quota

    process.env.VERCEL_ENV = "preview";
    delete process.env.ALLOW_PREVIEW_GEMINI_CALLS;

    await expect(assertQuotaHeadroom("gemini-2.5-flash", 2)).rejects.toThrow(PreviewEnvironmentBlockedError);
    // The block must be categorical, not a quota lookup — confirmed by
    // never even querying today's usage.
    expect(prisma.geminiCallLog.count).not.toHaveBeenCalled();
  });

  it("does not block Production or Development deployments", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { assertQuotaHeadroom } = await import("@/lib/geminiQuotaState");
    (prisma.geminiCallLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    process.env.VERCEL_ENV = "production";
    await expect(assertQuotaHeadroom("gemini-2.5-flash", 2)).resolves.toBeDefined();

    process.env.VERCEL_ENV = "development";
    await expect(assertQuotaHeadroom("gemini-2.5-flash", 2)).resolves.toBeDefined();
  });

  it("allows an explicit, deliberate override via ALLOW_PREVIEW_GEMINI_CALLS", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { assertQuotaHeadroom } = await import("@/lib/geminiQuotaState");
    (prisma.geminiCallLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    process.env.VERCEL_ENV = "preview";
    process.env.ALLOW_PREVIEW_GEMINI_CALLS = "true";

    await expect(assertQuotaHeadroom("gemini-2.5-flash", 2)).resolves.toBeDefined();
  });
});
