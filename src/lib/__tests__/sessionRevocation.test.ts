import { describe, it, expect, vi, beforeEach } from "vitest";

// Revocation used to be KV-only (never configured, so a no-op) and keyed on
// jti/iat, which next-auth rewrites on every session read. These pin down
// the replacement: a per-user cutoff compared with the token's own sign-in
// time, checked on every request in the jwt callback.

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));

const mocked = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const MIN = 60_000;

async function jwtCallback(token: Record<string, unknown>, user?: Record<string, unknown>) {
  const { authOptions } = await import("@/lib/auth");
  return authOptions.callbacks!.jwt!({ token, user } as never) as Promise<Record<string, unknown>>;
}

describe("session revocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokeAllUserSessions stamps the user's cutoff in the database", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { revokeAllUserSessions } = await import("@/lib/sessionRevocation");
    await revokeAllUserSessions("u1");
    const call = mocked(prisma.user.updateMany).mock.calls[0][0];
    expect(call.where).toEqual({ id: "u1" });
    expect(call.data.sessionsValidAfter).toBeInstanceOf(Date);
  });

  it("a fresh sign-in records authTime and skips the database", async () => {
    const { prisma } = await import("@/lib/prisma");
    const before = Date.now();
    const t = await jwtCallback({}, { id: "u1", role: "STUDENT" });
    expect(t.id).toBe("u1");
    expect(t.authTime as number).toBeGreaterThanOrEqual(before);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("ends a session signed in before the cutoff, even though next-auth gave it a fresh iat", async () => {
    const { prisma } = await import("@/lib/prisma");
    const now = Date.now();
    mocked(prisma.user.findUnique).mockResolvedValue({ role: "STUDENT", suspended: false, sessionsValidAfter: new Date(now - MIN) });
    // iat is "now" because the library re-issued the token; authTime is the real sign-in.
    const t = await jwtCallback({ id: "u1", role: "STUDENT", authTime: now - 5 * MIN, iat: Math.floor(now / 1000) });
    expect(t).toEqual({});
  });

  it("keeps a session signed in after the cutoff, and picks up the current role", async () => {
    const { prisma } = await import("@/lib/prisma");
    const now = Date.now();
    mocked(prisma.user.findUnique).mockResolvedValue({ role: "TEACHER", suspended: false, sessionsValidAfter: new Date(now - 5 * MIN) });
    const t = await jwtCallback({ id: "u1", role: "STUDENT", authTime: now - MIN });
    expect(t).toMatchObject({ id: "u1", role: "TEACHER" });
  });

  it.each([
    ["a deleted account", null],
    ["a suspended flag", { role: "STUDENT", suspended: true, sessionsValidAfter: null }],
    ["the SUSPENDED role", { role: "SUSPENDED", suspended: false, sessionsValidAfter: null }],
  ])("ends the session for %s", async (_label, row) => {
    const { prisma } = await import("@/lib/prisma");
    mocked(prisma.user.findUnique).mockResolvedValue(row);
    expect(await jwtCallback({ id: "u1", role: "STUDENT", authTime: Date.now() - MIN })).toEqual({});
  });

  it("ends a session older than the 7-day absolute lifetime, however active", async () => {
    const { prisma } = await import("@/lib/prisma");
    mocked(prisma.user.findUnique).mockResolvedValue({ role: "STUDENT", suspended: false, sessionsValidAfter: null });
    expect(await jwtCallback({ id: "u1", authTime: Date.now() - 8 * 24 * 60 * MIN })).toEqual({});
  });

  it("an ended token yields no session at all, which next-auth reads as signed out", async () => {
    const { authOptions } = await import("@/lib/auth");
    const s = await authOptions.callbacks!.session!({ session: { user: { name: "x" }, expires: "" }, token: {} } as never);
    expect(Object.keys(s)).toHaveLength(0);
  });
});
