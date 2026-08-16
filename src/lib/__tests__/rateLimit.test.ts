import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Regression coverage for a real, confirmed-live incident: KV_REST_API_URL
// and KV_REST_API_TOKEN have never been set in any Vercel environment, so
// rateLimit() — the function proxy.ts calls to protect every auth endpoint
// plus evaluation-enqueue — was unconditionally failing open. The privacy
// policy's "Rate limiting on all authentication endpoints" claim was not
// true. This locks in the database-backed fallback that fixes it.

vi.mock("@vercel/kv", () => ({ kv: { incr: vi.fn(), expire: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({
  prisma: { rateLimit: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), create: vi.fn() } },
}));

describe("rateLimit — database fallback when KV isn't configured", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("allows the first request for a fresh key and persists a count of 1", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { rateLimit } = await import("@/lib/rateLimit");
    (prisma.rateLimit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.rateLimit.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await rateLimit("test:1.2.3.4", 3, 60);

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ count: 1 }) })
    );
  });

  it("denies once the count reaches the limit within the window", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { rateLimit } = await import("@/lib/rateLimit");
    (prisma.rateLimit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 3,
      resetAt: new Date(Date.now() + 30_000),
    });

    const result = await rateLimit("test:1.2.3.4", 3, 60);

    expect(result.allowed).toBe(false);
    expect(prisma.rateLimit.update).not.toHaveBeenCalled();
  });

  it("allows a request under the limit and increments the count", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { rateLimit } = await import("@/lib/rateLimit");
    (prisma.rateLimit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 1,
      resetAt: new Date(Date.now() + 30_000),
    });
    (prisma.rateLimit.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await rateLimit("test:1.2.3.4", 3, 60);

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: { increment: 1 } } })
    );
  });

  it("resets the count once the window has expired, even if the old count was over the limit", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { rateLimit } = await import("@/lib/rateLimit");
    (prisma.rateLimit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 99,
      resetAt: new Date(Date.now() - 1000), // already expired
    });
    (prisma.rateLimit.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await rateLimit("test:1.2.3.4", 3, 60);

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ count: 1 }) })
    );
  });

  it("fails open if the database itself errors", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { rateLimit } = await import("@/lib/rateLimit");
    (prisma.rateLimit.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("connection lost"));

    const result = await rateLimit("test:1.2.3.4", 3, 60);

    expect(result.allowed).toBe(true);
  });

  it("checkRateLimit() returns a plain boolean wrapping the same result", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { checkRateLimit } = await import("@/lib/rateLimit");
    (prisma.rateLimit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 5,
      resetAt: new Date(Date.now() + 30_000),
    });

    const allowed = await checkRateLimit("test:signup:1.2.3.4", 5, 60 * 60 * 1000);
    expect(allowed).toBe(false);
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
});
