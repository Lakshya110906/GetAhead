import { describe, it, expect } from "vitest";
import {
  validateQuestionGrade,
  looksMismatched,
  buildOverallFeedback,
  displayErrorCategory,
  gradeFromPercentage,
  normalizeForQuoteMatch,
  MODEL_ID,
  EXTRACTION_PROMPT_VERSION,
  GRADE_PROMPT_VERSION,
} from "@/lib/answerSheetGrading";
import type { ExtractedQuestion, QuestionGrade } from "@/lib/answerSheetSchema";

function makeQuestion(overrides: Partial<ExtractedQuestion> = {}): ExtractedQuestion {
  return {
    questionNumber: 1,
    questionText: "Balance the equation: N2 + H2 -> NH3",
    marksAvailable: 5,
    studentAnswer: "N2 + 3H2 -> 2NH3. This is balanced because nitrogen and hydrogen atoms match on both sides.",
    answerStatus: "readable",
    ...overrides,
  };
}

function makeGrade(overrides: Partial<QuestionGrade> = {}): QuestionGrade {
  return {
    questionNumber: 1,
    marksAwarded: 5,
    marksAvailable: 5,
    topic: "Chemical equations",
    correctPoints: ["Correctly balanced all atoms"],
    incorrectPoints: [],
    errorType: "correct",
    groundingQuote: "N2 + 3H2 -> 2NH3",
    feedback: "Fully correct — the equation is properly balanced.",
    ...overrides,
  };
}

// ── Section 3 VALIDATE gates, checked in code ────────────────────────────────
describe("validateQuestionGrade", () => {
  it("passes a fully valid, grounded grade", () => {
    const q = makeQuestion();
    const g = makeGrade();
    expect(validateQuestionGrade(g, q)).toEqual([]);
  });

  it("rejects marksAwarded exceeding marksAvailable", () => {
    const q = makeQuestion({ marksAvailable: 5 });
    const g = makeGrade({ marksAwarded: 7, marksAvailable: 5, errorType: "incorrect" });
    const violations = validateQuestionGrade(g, q);
    expect(violations.some((v) => v.includes("between 0 and 5"))).toBe(true);
  });

  it("rejects negative marksAwarded", () => {
    const q = makeQuestion();
    const g = makeGrade({ marksAwarded: -1, errorType: "incorrect" });
    expect(validateQuestionGrade(g, q).some((v) => v.includes("between 0 and"))).toBe(true);
  });

  it("rejects a marksAvailable that doesn't match the question's actual available marks", () => {
    const q = makeQuestion({ marksAvailable: 5 });
    const g = makeGrade({ marksAvailable: 4 });
    expect(validateQuestionGrade(g, q).some((v) => v.includes("marksAvailable"))).toBe(true);
  });

  // The central grounding requirement: a judgement with no quote is rejected.
  it("rejects a non-blank/unreadable grade with an empty groundingQuote", () => {
    const q = makeQuestion();
    const g = makeGrade({ groundingQuote: "", errorType: "incorrect", marksAwarded: 2 });
    expect(validateQuestionGrade(g, q).some((v) => v.includes("no groundingQuote"))).toBe(true);
  });

  it("rejects a groundingQuote that is not a verbatim substring of the student's answer", () => {
    const q = makeQuestion({ studentAnswer: "N2 + 3H2 -> 2NH3, fully balanced." });
    const g = makeGrade({ groundingQuote: "this text does not appear anywhere in the answer" });
    expect(validateQuestionGrade(g, q).some((v) => v.includes("not a verbatim substring"))).toBe(true);
  });

  it("accepts a groundingQuote that matches modulo whitespace/case", () => {
    const q = makeQuestion({ studentAnswer: "N2  +  3H2   ->  2NH3" });
    const g = makeGrade({ groundingQuote: "n2 + 3h2 -> 2nh3" });
    expect(validateQuestionGrade(g, q).some((v) => v.includes("not a verbatim substring"))).toBe(false);
  });

  it("does not require a groundingQuote for blank or unreadable answers", () => {
    const q = makeQuestion({ answerStatus: "unreadable", studentAnswer: "" });
    const g = makeGrade({ errorType: "unreadable", groundingQuote: "", marksAwarded: 0 });
    expect(validateQuestionGrade(g, q)).toEqual([]);
  });

  it("rejects errorType 'correct' that doesn't carry full marks — correct work must not be shaved", () => {
    const q = makeQuestion({ marksAvailable: 5 });
    const g = makeGrade({ errorType: "correct", marksAwarded: 4, marksAvailable: 5 });
    expect(validateQuestionGrade(g, q).some((v) => v.includes("must receive full marks"))).toBe(true);
  });

  it("rejects a questionNumber mismatch", () => {
    const q = makeQuestion({ questionNumber: 3 });
    const g = makeGrade({ questionNumber: 1 });
    expect(validateQuestionGrade(g, q).some((v) => v.includes("questionNumber"))).toBe(true);
  });
});

// ── Subject/grade cross-check ────────────────────────────────────────────────
describe("looksMismatched", () => {
  it("flags a clear mismatch", () => {
    expect(looksMismatched("Physics", "Chemistry")).toBe(true);
  });
  it("does not flag when detected is a superset/substring of declared", () => {
    expect(looksMismatched("Chemistry", "Chemistry - Class 12 Board Exam")).toBe(false);
  });
  it("does not flag when the model couldn't tell (empty/undefined detected)", () => {
    expect(looksMismatched("Chemistry", undefined)).toBe(false);
    expect(looksMismatched("Chemistry", "")).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(looksMismatched("chemistry", "CHEMISTRY")).toBe(false);
  });
  it("flags a mismatch even when one word is a raw substring of the other", () => {
    // Plain .includes() would treat "Biochemistry" as containing
    // "Chemistry" and silently pass — these are different subjects.
    expect(looksMismatched("Biochemistry", "Chemistry")).toBe(true);
    expect(looksMismatched("Trigonometry", "Geometry")).toBe(true);
  });
});

// ── Grounded overall feedback — built in code from real per-question grades,
// never a separate summarization call ────────────────────────────────────────
describe("buildOverallFeedback", () => {
  it("names specific questions and their model-chosen error category, not generic text", () => {
    const grades = [
      makeGrade({ questionNumber: 1, errorType: "correct" }),
      makeGrade({ questionNumber: 2, errorType: "incorrect", errorCategory: "Wrong formula", incorrectPoints: ["Used the wrong formula entirely"] }),
      makeGrade({ questionNumber: 3, errorType: "incorrect", errorCategory: "Arithmetic slip", incorrectPoints: ["Correct method, dropped a minus sign"] }),
    ];
    const feedback = buildOverallFeedback(grades);
    expect(feedback).toContain("Q1");
    expect(feedback).toContain("Q2");
    expect(feedback).toContain("Wrong formula");
    expect(feedback).toContain("Q3");
    expect(feedback).toContain("Arithmetic slip");
    expect(feedback).toContain("dropped a minus sign");
  });

  it("mentions unreadable question count when present", () => {
    const grades = [makeGrade({ questionNumber: 1, errorType: "unreadable", groundingQuote: "" })];
    const feedback = buildOverallFeedback(grades);
    expect(feedback).toMatch(/1 question.*unreadable/i);
  });

  // Regression: blank and unreadable share an errorType-driven code path in
  // buildOverallFeedback, but must produce distinct messages — a blank
  // answer counts toward the total, an unreadable one is excluded from it,
  // and conflating the two in the summary text would misreport the total
  // the same way the scoring bug this fixes did.
  it("mentions blank question count separately from unreadable, and says it counts toward the total", () => {
    const grades = [
      makeGrade({ questionNumber: 1, errorType: "blank", groundingQuote: "", marksAwarded: 0 }),
      makeGrade({ questionNumber: 2, errorType: "unreadable", groundingQuote: "", marksAwarded: 0 }),
    ];
    const feedback = buildOverallFeedback(grades);
    expect(feedback).toMatch(/1 question.*blank/i);
    expect(feedback.toLowerCase()).toContain("counted toward the total");
    expect(feedback).toMatch(/1 question.*unreadable/i);
    expect(feedback.toLowerCase()).toContain("excluded from the total");
  });
});

// ── errorCategory replaces the old hardcoded method_error/arithmetic_slip
// binary (a maths-shaped taxonomy that mislabeled things like an unbalanced
// chemical equation as "Arithmetic slip"). It's free text, model-authored —
// these tests are the "must never contradict the feedback" guard from that
// fix: a category is only ever shown when there's something in
// incorrectPoints to actually ground it in. ─────────────────────────────────
describe("displayErrorCategory", () => {
  it("shows the category for an incorrect grade with real incorrectPoints behind it", () => {
    const g = makeGrade({ errorType: "incorrect", errorCategory: "Unbalanced equation", incorrectPoints: ["Missing a coefficient"] });
    expect(displayErrorCategory(g)).toBe("Unbalanced equation");
  });

  it("drops the category when incorrectPoints is empty — nothing to ground it in", () => {
    const g = makeGrade({ errorType: "incorrect", errorCategory: "Unbalanced equation", incorrectPoints: [] });
    expect(displayErrorCategory(g)).toBeNull();
  });

  it("drops the category for a correct grade, even if one was somehow set", () => {
    const g = makeGrade({ errorType: "correct", errorCategory: "Unbalanced equation", incorrectPoints: [] });
    expect(displayErrorCategory(g)).toBeNull();
  });

  it("drops the category for blank/unreadable grades", () => {
    expect(displayErrorCategory(makeGrade({ errorType: "blank", errorCategory: "Something", groundingQuote: "" }))).toBeNull();
    expect(displayErrorCategory(makeGrade({ errorType: "unreadable", errorCategory: "Something", groundingQuote: "" }))).toBeNull();
  });

  it("returns null rather than an empty string when no category was given", () => {
    const g = makeGrade({ errorType: "incorrect", incorrectPoints: ["Wrong answer"] });
    expect(displayErrorCategory(g)).toBeNull();
  });

  it("returns null for a whitespace-only category", () => {
    const g = makeGrade({ errorType: "incorrect", errorCategory: "   ", incorrectPoints: ["Wrong answer"] });
    expect(displayErrorCategory(g)).toBeNull();
  });
});

describe("gradeFromPercentage", () => {
  it.each([
    [95, "A+"], [90, "A+"], [85, "A"], [80, "A"],
    [75, "B+"], [70, "B+"], [65, "B"], [60, "B"],
    [55, "C"], [50, "C"], [49, "F"], [0, "F"],
  ])("maps %i%% to %s", (pct, expected) => {
    expect(gradeFromPercentage(pct)).toBe(expected);
  });
});

describe("normalizeForQuoteMatch", () => {
  it("collapses whitespace and lowercases for comparison purposes", () => {
    expect(normalizeForQuoteMatch("  Hello   World  ")).toBe("hello world");
  });
});

describe("audit metadata", () => {
  it("exposes a stable model identifier", () => {
    expect(MODEL_ID).toBe("gemini-2.5-flash");
  });
  it("computes deterministic, non-empty prompt version hashes for both stages", () => {
    expect(EXTRACTION_PROMPT_VERSION).toBeTruthy();
    expect(GRADE_PROMPT_VERSION).toBeTruthy();
    expect(EXTRACTION_PROMPT_VERSION).not.toBe(GRADE_PROMPT_VERSION);
  });
});
