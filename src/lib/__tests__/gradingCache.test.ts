import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExtractionResult, GradedAnswerSheet } from "@/lib/answerSheetSchema";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gradingCache: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const EXTRACTION: ExtractionResult = {
  questions: [],
} as unknown as ExtractionResult;

const RESULT: GradedAnswerSheet = {
  totalMarks: 25,
  obtainedMarks: 16,
  percentage: 64,
  questionGrades: [],
} as unknown as GradedAnswerSheet;

describe("gradingCache — content hashing", () => {
  it("is stable for identical inputs", async () => {
    const { computeGradingContentHash } = await import("@/lib/gradingCache");
    const input = {
      fileBytes: Buffer.from("same file"),
      subject: "Chemistry",
      grade: "10th",
      examType: "Unit Test",
      modelId: "gemini-2.5-flash",
      promptVersion: "abc.def",
    };
    expect(computeGradingContentHash(input)).toBe(computeGradingContentHash({ ...input }));
  });

  it("changes if the file bytes change", async () => {
    const { computeGradingContentHash } = await import("@/lib/gradingCache");
    const base = {
      subject: "Chemistry",
      grade: "10th",
      examType: "Unit Test",
      modelId: "gemini-2.5-flash",
      promptVersion: "abc.def",
    };
    const a = computeGradingContentHash({ ...base, fileBytes: Buffer.from("file A") });
    const b = computeGradingContentHash({ ...base, fileBytes: Buffer.from("file B") });
    expect(a).not.toBe(b);
  });

  it("changes if subject, grade, examType, model, or prompt version changes — never silently reused across a context it wasn't graded under", async () => {
    const { computeGradingContentHash } = await import("@/lib/gradingCache");
    const base = {
      fileBytes: Buffer.from("same file"),
      subject: "Chemistry",
      grade: "10th",
      examType: "Unit Test",
      modelId: "gemini-2.5-flash",
      promptVersion: "abc.def",
    };
    const variants = [
      { ...base, subject: "Physics" },
      { ...base, grade: "11th" },
      { ...base, examType: "Board" },
      { ...base, modelId: "gemini-2.0-flash" },
      { ...base, promptVersion: "abc.ghi" },
    ];
    const baseHash = computeGradingContentHash(base);
    for (const v of variants) {
      expect(computeGradingContentHash(v)).not.toBe(baseHash);
    }
  });

  // The concatenation itself must not create false collisions across a
  // field boundary — geminiFixtureCache.ts's hashOf() has exactly this gap
  // (no separator between parts), acceptable there (test-only, low stakes)
  // but not here: a collision here means serving a DIFFERENT context's
  // grade as this one's.
  it("does not collide across a field boundary the way an unseparated concatenation would", async () => {
    const { computeGradingContentHash } = await import("@/lib/gradingCache");
    const a = computeGradingContentHash({
      fileBytes: Buffer.from("x"),
      subject: "Ma",
      grade: "th10th",
      examType: "Unit Test",
      modelId: "gemini-2.5-flash",
      promptVersion: "v1",
    });
    const b = computeGradingContentHash({
      fileBytes: Buffer.from("x"),
      subject: "Math",
      grade: "10th",
      examType: "Unit Test",
      modelId: "gemini-2.5-flash",
      promptVersion: "v1",
    });
    expect(a).not.toBe(b);
  });
});

describe("gradingCache — lookup and write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null on a miss without incrementing anything", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { lookupGradingCache } = await import("@/lib/gradingCache");
    (prisma.gradingCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const hit = await lookupGradingCache("some-hash");
    expect(hit).toBeNull();
    expect(prisma.gradingCache.update).not.toHaveBeenCalled();
  });

  it("returns the parsed extraction/result on a hit, and bumps hitCount", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { lookupGradingCache } = await import("@/lib/gradingCache");
    (prisma.gradingCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      contentHash: "some-hash",
      extraction: JSON.stringify(EXTRACTION),
      result: JSON.stringify(RESULT),
    });
    (prisma.gradingCache.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const hit = await lookupGradingCache("some-hash");
    expect(hit).not.toBeNull();
    expect(hit!.result.obtainedMarks).toBe(16);
    expect(hit!.extraction).toEqual(EXTRACTION);
    expect(prisma.gradingCache.update).toHaveBeenCalledWith({
      where: { contentHash: "some-hash" },
      data: { hitCount: { increment: 1 } },
    });
  });

  it("a rejected hitCount bump never blocks the cache hit from being served", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { lookupGradingCache } = await import("@/lib/gradingCache");
    (prisma.gradingCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      contentHash: "some-hash",
      extraction: JSON.stringify(EXTRACTION),
      result: JSON.stringify(RESULT),
    });
    (prisma.gradingCache.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("db hiccup"));

    const hit = await lookupGradingCache("some-hash");
    expect(hit).not.toBeNull();
    expect(hit!.result.obtainedMarks).toBe(16);
  });

  it("a hitCount bump that throws SYNCHRONOUSLY (not just rejects) still never blocks the cache hit — a test double without a resolved value returns undefined, not a promise, the way a bare .catch() on the call would assume", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { lookupGradingCache } = await import("@/lib/gradingCache");
    (prisma.gradingCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      contentHash: "some-hash",
      extraction: JSON.stringify(EXTRACTION),
      result: JSON.stringify(RESULT),
    });
    // No .mockResolvedValue/.mockRejectedValue set — vi.fn() returns
    // `undefined`, so calling `.catch()` directly on the result (instead of
    // awaiting inside a try/catch) would throw synchronously here.
    (prisma.gradingCache.update as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const hit = await lookupGradingCache("some-hash");
    expect(hit).not.toBeNull();
    expect(hit!.result.obtainedMarks).toBe(16);
  });

  it("writeGradingCache upserts on the content hash, creating and updating with the same payload", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { writeGradingCache } = await import("@/lib/gradingCache");
    (prisma.gradingCache.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await writeGradingCache({
      contentHash: "some-hash",
      modelId: "gemini-2.5-flash",
      promptVersion: "abc.def",
      subject: "Chemistry",
      grade: "10th",
      examType: "Unit Test",
      extraction: EXTRACTION,
      result: RESULT,
    });

    expect(prisma.gradingCache.upsert).toHaveBeenCalledTimes(1);
    const call = (prisma.gradingCache.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where).toEqual({ contentHash: "some-hash" });
    expect(JSON.parse(call.create.result)).toEqual(RESULT);
    expect(JSON.parse(call.update.result)).toEqual(RESULT);
  });
});
