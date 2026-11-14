import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Regression coverage for a real, confirmed-live incident: KV_REST_API_URL
// and KV_REST_API_TOKEN have never been set in any Vercel environment, so
// rateLimit() — the function proxy.ts calls to protect every auth endpoint
// plus evaluation-enqueue — was unconditionally failing open. The privacy
// policy's "Rate limiting on all authentication endpoints" claim was not
// true. This locks in the database-backed fallback that fixes it.

vi.mock("@vercel/kv", () => ({ kv: { incr: vi.fn(), expire: vi.fn() } }));
// A tiny in-memory RateLimit table with the same conditional-update
// semantics as the database, so these exercise the limiter's real logic
// (including a concurrent burst) rather than the order of mocked calls.
type Row = { key: string; count: number; resetAt: Date };
const table = new Map<string, Row>();
const matches = (row: Row, where: { key: string; resetAt: { gte?: Date; lt?: Date } }) =>
  row.key === where.key &&
  (where.resetAt.gte === undefined || row.resetAt >= where.resetAt.gte) &&
  (where.resetAt.lt === undefined || row.resetAt < where.resetAt.lt);
const tick = () => new Promise((r) => setTimeout(r, 0));

// $transaction runs callbacks one at a time, standing in for the row lock
// the UPDATE takes until commit.
let txQueue: Promise<unknown> = Promise.resolve();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const { prisma } = await import("@/lib/prisma");
      const run = txQueue.then(() => fn(prisma));
      txQueue = run.catch(() => undefined);
      return run;
    }),
    rateLimit: {
      updateMany: vi.fn(async ({ where, data }) => {
        await tick();
        const row = table.get(where.key);
        if (!row || !matches(row, where)) return { count: 0 };
        if (data.count?.increment) row.count += data.count.increment;
        else Object.assign(row, data);
        return { count: 1 };
      }),
      findUnique: vi.fn(async ({ where }) => {
        await tick();
        const row = table.get(where.key);
        return row ? { ...row } : null;
      }),
      create: vi.fn(async ({ data }) => {
        await tick();
        if (table.has(data.key)) throw Object.assign(new Error("unique"), { code: "P2002" });
        table.set(data.key, { ...data });
        return data;
      }),
    },
  },
}));

describe("rateLimit — database limiter when KV isn't configured", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    table.clear();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("allows up to the limit in one window, then denies", async () => {
    const { rateLimit } = await import("@/lib/rateLimit");
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await rateLimit("t:ip", 3, 60)).allowed);
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("a concurrent burst gets exactly `limit` through: not every racer, and not none", async () => {
    // The old read-then-write let every racer read count 0 and pass; an
    // increment read back outside a transaction can see the final total
    // and deny them all.
    const { rateLimit } = await import("@/lib/rateLimit");
    table.set("t:burst", { key: "t:burst", count: 0, resetAt: new Date(Date.now() + 60_000) });
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit("t:burst", 3, 60)));
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
  });

  it("starts a fresh window once the old one has expired, even if it was over the limit", async () => {
    const { rateLimit } = await import("@/lib/rateLimit");
    table.set("t:old", { key: "t:old", count: 99, resetAt: new Date(Date.now() - 1000) });
    const r = await rateLimit("t:old", 3, 60);
    expect(r.allowed).toBe(true);
    expect(table.get("t:old")!.count).toBe(1);
    expect(table.get("t:old")!.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("refuses, flagged unavailable, if the database errors (it used to let everything through)", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { rateLimit } = await import("@/lib/rateLimit");
    (prisma.rateLimit.updateMany as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("connection lost"));

    const result = await rateLimit("t:ip", 3, 60);

    expect(result).toMatchObject({ allowed: false, unavailable: true });
  });

  it("checkRateLimit() returns a plain boolean wrapping the same result", async () => {
    const { checkRateLimit } = await import("@/lib/rateLimit");
    table.set("t:signup", { key: "t:signup", count: 5, resetAt: new Date(Date.now() + 30_000) });
    expect(await checkRateLimit("t:signup", 5, 60 * 60 * 1000)).toBe(false);
  });
});

describe("rateLimit — uses KV directly when configured (existing behavior, unchanged)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.KV_REST_API_URL = "https://example-kv.upstash.io";
    process.env.KV_REST_API_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("calls kv.incr rather than the database when KV is configured", async () => {
    const { kv } = await import("@vercel/kv");
    const { prisma } = await import("@/lib/prisma");
    (kv.incr as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    const { rateLimit } = await import("@/lib/rateLimit");

    const result = await rateLimit("test:1.2.3.4", 5, 60);

    expect(result.allowed).toBe(true);
    expect(kv.incr).toHaveBeenCalled();
    expect(prisma.rateLimit.findUnique).not.toHaveBeenCalled();
  });

  it("falls back to the database limiter, not to allowing everything, when KV errors", async () => {
    const { kv } = await import("@vercel/kv");
    (kv.incr as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("kv down"));
    table.set("t:kvdown", { key: "t:kvdown", count: 5, resetAt: new Date(Date.now() + 30_000) });
    const { rateLimit } = await import("@/lib/rateLimit");

    expect((await rateLimit("t:kvdown", 5, 60)).allowed).toBe(false);
  });
});
