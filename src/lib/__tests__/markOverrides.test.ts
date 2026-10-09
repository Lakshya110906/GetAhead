import { describe, it, expect } from "vitest";
import {
  parseMarkOverrides,
  effectiveMarks,
  recomputeTotals,
  applyOverride,
  type MarkOverrides,
} from "@/lib/markOverrides";
import type { QuestionGrade } from "@/lib/answerSheetSchema";

function grade(questionNumber: number, marksAwarded: number, marksAvailable: number): QuestionGrade {
  return {
    questionNumber,
    marksAwarded,
    marksAvailable,
    correctPoints: [],
    incorrectPoints: [],
    errorType: marksAwarded === marksAvailable ? "correct" : "incorrect",
    groundingQuote: "",
    feedback: "",
  } as QuestionGrade;
}

// chem-sheet's real shape: 25 marks over five questions, AI total 16.
const GRADES = [grade(1, 5, 5), grade(2, 2, 4), grade(3, 1, 5), grade(4, 2, 5), grade(5, 6, 6)];

describe("parseMarkOverrides", () => {
  it("treats missing or empty as no overrides", () => {
    expect(parseMarkOverrides(null)).toEqual({});
    expect(parseMarkOverrides("")).toEqual({});
  });

  it("survives a corrupt blob rather than taking the report down with it", () => {
    expect(parseMarkOverrides("{not json")).toEqual({});
    expect(parseMarkOverrides("[1,2,3]")).toEqual({});
    expect(parseMarkOverrides("null")).toEqual({});
  });
});

describe("effectiveMarks", () => {
  it("prefers the person's mark over the AI's", () => {
    const o: MarkOverrides = { "3": { marks: 3, adjustedAt: "2026-10-09T00:00:00.000Z" } };
    expect(effectiveMarks(grade(3, 1, 5), o)).toBe(3);
  });

  it("falls back to the AI's mark where nobody disagreed", () => {
    expect(effectiveMarks(grade(3, 1, 5), {})).toBe(1);
  });

  it("honours an override of zero rather than treating it as absent", () => {
    const o: MarkOverrides = { "1": { marks: 0, adjustedAt: "2026-10-09T00:00:00.000Z" } };
    expect(effectiveMarks(grade(1, 5, 5), o)).toBe(0);
  });
});

describe("recomputeTotals", () => {
  it("matches the AI's own total when nothing is overridden", () => {
    expect(recomputeTotals(GRADES, {})).toEqual({ obtainedMarks: 16, totalMarks: 25, percentage: 64 });
  });

  it("changes only the numerator — the denominator is the paper's, not the marker's", () => {
    const o: MarkOverrides = { "3": { marks: 3, adjustedAt: "x" } };
    const t = recomputeTotals(GRADES, o);
    expect(t.obtainedMarks).toBe(18);
    expect(t.totalMarks).toBe(25);
    expect(t.percentage).toBe(72);
  });

  it("does not divide by zero on a sheet with no marks available", () => {
    expect(recomputeTotals([], {})).toEqual({ obtainedMarks: 0, totalMarks: 0, percentage: 0 });
  });
});

describe("applyOverride", () => {
  it("records the mark, the note and when it was set", () => {
    const r = applyOverride({}, GRADES, { questionNumber: 3, marks: 3, note: "Named the right reaction type" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.overrides["3"].marks).toBe(3);
    expect(r.overrides["3"].note).toBe("Named the right reaction type");
    expect(Date.parse(r.overrides["3"].adjustedAt)).not.toBeNaN();
  });

  it("refuses more marks than the question is worth — the same bound the model is held to", () => {
    const r = applyOverride({}, GRADES, { questionNumber: 2, marks: 7 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("out of 4 marks");
  });

  it("allows full marks exactly", () => {
    expect(applyOverride({}, GRADES, { questionNumber: 2, marks: 4 }).ok).toBe(true);
  });

  it("refuses a question that isn't on the paper", () => {
    const r = applyOverride({}, GRADES, { questionNumber: 99, marks: 1 });
    expect(r.ok).toBe(false);
  });

  it("clears the override on null, restoring the AI's mark", () => {
    const existing: MarkOverrides = { "3": { marks: 3, adjustedAt: "x" } };
    const r = applyOverride(existing, GRADES, { questionNumber: 3, marks: null });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.overrides["3"]).toBeUndefined();
    expect(recomputeTotals(GRADES, r.overrides).obtainedMarks).toBe(16);
  });

  it("never mutates the map it was given", () => {
    const existing: MarkOverrides = { "3": { marks: 3, adjustedAt: "x" } };
    applyOverride(existing, GRADES, { questionNumber: 4, marks: 5 });
    expect(Object.keys(existing)).toEqual(["3"]);
  });
});
