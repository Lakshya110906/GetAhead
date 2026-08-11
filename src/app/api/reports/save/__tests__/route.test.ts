import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression test for a confirmed, live IDOR: POST /api/reports/save created a
// SavedReport row for ANY evaluationId with no check that it belonged to the
// caller, and GET /api/reports/save's list mode returned the full embedded
// evaluation (OCR'd answer text, marks, feedback, file URL) without ever
// re-checking ownership. Both are fixed; this proves user A cannot save or
// read user B's evaluation through this route.

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evaluation: { findFirst: vi.fn() },
    savedReport: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/apiError", () => ({ reportApiError: vi.fn(() => new Response(JSON.stringify({ error: "failed" }), { status: 500 })) }));

const USER_A = "user_A";
const USER_B = "user_B";
const EVALUATION_B = "evaluation_owned_by_B";

function sessionFor(userId: string) {
  return { user: { id: userId } };
}

function fakePostRequest(body: unknown) {
  return { json: async () => body } as unknown as Request;
}

function fakeGetRequest(url: string) {
  return { url } as unknown as Request;
}

describe("POST /api/reports/save — IDOR regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404, not 403, and does not create a SavedReport when the evaluation belongs to a different user", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma } = await import("@/lib/prisma");
    const { POST } = await import("../route");

    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sessionFor(USER_A));
    // The evaluation exists, but findFirst is scoped by { id, userId: USER_A } —
    // since it actually belongs to USER_B, this correctly finds nothing.
    (prisma.evaluation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(fakePostRequest({ evaluationId: EVALUATION_B }) as never);

    expect(prisma.evaluation.findFirst).toHaveBeenCalledWith({
      where: { id: EVALUATION_B, userId: USER_A },
      select: { id: true },
    });
    expect(res.status).toBe(404);
    // Never confirms to the caller that the evaluation exists at all.
    const body = await res.json();
    expect(body.error).not.toMatch(/forbidden|belongs to another/i);
    expect(prisma.savedReport.create).not.toHaveBeenCalled();
  });

  it("saves normally when the evaluation genuinely belongs to the caller", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma } = await import("@/lib/prisma");
    const { POST } = await import("../route");

    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sessionFor(USER_A));
    (prisma.evaluation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "evaluation_owned_by_A" });
    (prisma.savedReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.savedReport.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const res = await POST(fakePostRequest({ evaluationId: "evaluation_owned_by_A" }) as never);

    expect(res.status).toBe(200);
    expect(prisma.savedReport.create).toHaveBeenCalledWith({
      data: { userId: USER_A, evaluationId: "evaluation_owned_by_A", name: "Saved Evaluation Report" },
    });
  });
});

describe("GET /api/reports/save — IDOR regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes the list query by both SavedReport.userId AND evaluation.userId, never returning another user's evaluation", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma } = await import("@/lib/prisma");
    const { GET } = await import("../route");

    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sessionFor(USER_A));
    // Simulate the vulnerable table state directly: a SavedReport row owned
    // by A but pointing at an evaluation actually owned by B. The query
    // itself must exclude it — this is what proves the fix is in the query,
    // not a post-fetch filter that could be skipped or bypassed.
    (prisma.savedReport.findMany as ReturnType<typeof vi.fn>).mockImplementation(async (args) => {
      expect(args.where).toEqual({ userId: USER_A, evaluation: { userId: USER_A } });
      // A real DB honoring this where clause would never return the B-owned
      // row; the mock returns empty to prove the app doesn't need a second,
      // separate in-memory filter to stay safe.
      return [];
    });

    const res = await GET(fakeGetRequest("https://example.test/api/reports/save") as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.savedReports).toEqual([]);
    expect(prisma.savedReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_A, evaluation: { userId: USER_A } } })
    );
  });

  it("check-one mode (?evaluationId=) also stays scoped to the caller's own SavedReport rows", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma } = await import("@/lib/prisma");
    const { GET } = await import("../route");

    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sessionFor(USER_A));
    (prisma.savedReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(fakeGetRequest(`https://example.test/api/reports/save?evaluationId=${EVALUATION_B}`) as never);
    const body = await res.json();

    expect(prisma.savedReport.findFirst).toHaveBeenCalledWith({ where: { userId: USER_A, evaluationId: EVALUATION_B } });
    expect(body.saved).toBe(false);
  });
});
