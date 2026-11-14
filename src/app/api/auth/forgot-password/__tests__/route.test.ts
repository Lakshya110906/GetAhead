import { describe, it, expect, vi, beforeEach } from "vitest";

// Production had no email provider, yet every reset request was told "a
// link has been sent". Without one, the route must say so, the same way for
// every address, and must not create a token nobody can receive.

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() }, passwordResetToken: { create: vi.fn() }, auditLog: { create: vi.fn() } },
}));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: vi.fn(async () => true) }));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: vi.fn() }));
vi.mock("@/lib/errorTracking", () => ({ captureException: vi.fn() }));

const post = async (email: string) => {
  const { POST } = await import("@/app/api/auth/forgot-password/route");
  return POST({ headers: new Headers(), json: async () => ({ email }) } as never);
};

describe("POST /api/auth/forgot-password without an email provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it("says reset emails are unavailable, identically for known and unknown addresses", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "u1", name: "A" }).mockResolvedValueOnce(null);
    const known = await post("known@test.local");
    const unknown = await post("unknown@test.local");
    expect(known.status).toBe(503);
    expect(await known.json()).toEqual(await unknown.json());
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("with a provider configured, keeps the generic success answer", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const { prisma } = await import("@/lib/prisma");
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await post("unknown@test.local");
    expect(res.status).toBe(200);
  });
});
