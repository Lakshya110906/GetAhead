import { describe, it, expect, vi, beforeEach } from "vitest";

// Route-level cover for human-in-the-loop re-marking (PATCH action
// "override-mark"). The arithmetic itself is covered in
// src/lib/__tests__/markOverrides.test.ts; what matters here is the wiring:
// that it refuses someone else's evaluation, refuses an impossible mark,
// leaves the AI's own record (aiResponse) untouched, and writes the
// recomputed totals to the columns analytics and the dashboard read.

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { evaluation: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock("@/lib/evaluationWorker", () => ({ processSpecificJob: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/apiError", () => ({
  reportApiError: vi.fn(() => new Response(JSON.stringify({ error: "failed" }), { status: 500 })),
}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => void) => fn };
});

const OWNER = "user_owner";

// chem-sheet's real shape: five questions, 25 marks, AI total 16.
const AI_GRADES = [
  { questionNumber: 1, marksAwarded: 5, marksAvailable: 5 },
  { questionNumber: 2, marksAwarded: 2, marksAvailable: 4 },
  { questionNumber: 3, marksAwarded: 1, marksAvailable: 5 },
  { questionNumber: 4, marksAwarded: 2, marksAvailable: 5 },
  { questionNumber: 5, marksAwarded: 6, marksAvailable: 6 },
];

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: "eval_1",
    userId: OWNER,
    status: "SUCCEEDED",
    aiResponse: JSON.stringify({ questionGrades: AI_GRADES }),
    markOverrides: null,
    ...overrides,
  };
}

function req(body: unknown) {
  return { json: async () => body } as unknown as Request;
}

const ctx = { params: Promise.resolve({ id: "eval_1" }) };

async function patch(body: unknown) {
  const { PATCH } = await import("@/app/api/evaluations/[id]/route");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return PATCH(req(body) as any, ctx as any);
}

describe('PATCH /api/evaluations/[id] — action "override-mark"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function signedInAs(userId: string | null, row: unknown = job()) {
    const { getServerSession } = await import("next-auth");
    const { prisma } = await import("@/lib/prisma");
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(userId ? { user: { id: userId } } : null);
    (prisma.evaluation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(row);
    (prisma.evaluation.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    return prisma;
  }

  it("recomputes the totals and persists them to the columns analytics reads", async () => {
    const prisma = await signedInAs(OWNER);

    const res = await patch({ action: "override-mark", questionNumber: 3, marks: 3, note: "Right reaction type" });
    expect(res.status).toBe(200);
    const payload = await res.json();

    // 16 with the AI's 1/5 on Q3; 18 once a person marks it 3/5.
    expect(payload.obtainedMarks).toBe(18);
    expect(payload.totalMarks).toBe(25);
    expect(payload.percentage).toBe(72);

    const written = (prisma.evaluation.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(written.obtainedMarks).toBe(18);
    expect(written.percentage).toBe(72);
    expect(JSON.parse(written.markOverrides)["3"].marks).toBe(3);
    expect(JSON.parse(written.markOverrides)["3"].note).toBe("Right reaction type");
  });

  it("never rewrites the AI's own record", async () => {
    const prisma = await signedInAs(OWNER);
    await patch({ action: "override-mark", questionNumber: 3, marks: 3 });
    const written = (prisma.evaluation.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(written.aiResponse).toBeUndefined();
  });

  it("refuses more marks than the question is worth, and writes nothing", async () => {
    const prisma = await signedInAs(OWNER);
    const res = await patch({ action: "override-mark", questionNumber: 2, marks: 7 });
    expect(res.status).toBe(400);
    expect(prisma.evaluation.update).not.toHaveBeenCalled();
  });

  it("refuses a negative mark", async () => {
    const prisma = await signedInAs(OWNER);
    const res = await patch({ action: "override-mark", questionNumber: 2, marks: -1 });
    expect(res.status).toBe(400);
    expect(prisma.evaluation.update).not.toHaveBeenCalled();
  });

  it("clearing the last override nulls the column rather than leaving '{}' behind", async () => {
    const prisma = await signedInAs(
      OWNER,
      job({ markOverrides: JSON.stringify({ "3": { marks: 3, adjustedAt: "2026-10-09T00:00:00.000Z" } }) })
    );

    const res = await patch({ action: "override-mark", questionNumber: 3, marks: null });
    expect(res.status).toBe(200);
    const written = (prisma.evaluation.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(written.markOverrides).toBeNull();
    // Back to the AI's own total.
    expect(written.obtainedMarks).toBe(16);
  });

  it("does not expose another user's evaluation", async () => {
    const prisma = await signedInAs("someone_else");
    const res = await patch({ action: "override-mark", questionNumber: 3, marks: 3 });
    expect(res.status).toBe(404);
    expect(prisma.evaluation.update).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    const prisma = await signedInAs(null);
    const res = await patch({ action: "override-mark", questionNumber: 3, marks: 3 });
    expect(res.status).toBe(401);
    expect(prisma.evaluation.update).not.toHaveBeenCalled();
  });

  it("refuses to re-mark an evaluation that never finished grading", async () => {
    const prisma = await signedInAs(OWNER, job({ status: "FAILED", aiResponse: null }));
    const res = await patch({ action: "override-mark", questionNumber: 3, marks: 3 });
    expect(res.status).toBe(409);
    expect(prisma.evaluation.update).not.toHaveBeenCalled();
  });
});
