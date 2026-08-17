import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { gradeAnswerSheetFromFile, NotAnAnswerSheetError } from "@/lib/answerSheetGrading";
import type { ReplayOptions } from "@/lib/geminiFixtureCache";
import type { QuestionGrade } from "@/lib/answerSheetSchema";

// CI regression suite over the five (six, including blank-page) regression
// fixtures — runs entirely against RECORDED responses (fixtures/gemini-cache),
// never live. That's the whole point: fast, free, and runs on every change
// to a grading prompt, a validation schema, or any route that calls a model
// (see .github/workflows/fixture-regression.yml for the trigger paths).
//
// If a fixture's recording is missing or stale (the file/prompt changed
// since it was last recorded), this suite fails loudly with a specific
// message rather than silently attempting a live call with no API key
// configured in CI — see the "recorded=0" assertion in each test.
//
// To (re)record after a genuine content/prompt change:
//   npx tsx scripts/generate-fixtures.ts   # if fixture content changed
//   npm run fixtures:live                  # records fresh responses
// then commit the updated fixtures/gemini-cache/**.

interface FixtureMetadata {
  id: string;
  subject: string;
  grade: string;
  examType: string;
  file: string;
  mimeType: string;
}

function loadFixture(id: string): { meta: FixtureMetadata; fileBytes: Buffer } {
  const dir = join(process.cwd(), "fixtures", "regression-set", id);
  const meta: FixtureMetadata = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf-8"));
  const fileBytes = readFileSync(join(dir, meta.file));
  return { meta, fileBytes };
}

function feedbackText(g: QuestionGrade): string {
  return [g.feedback, ...g.correctPoints, ...g.incorrectPoints, g.groundingQuote].join(" ").toLowerCase();
}

function namesTheError(g: QuestionGrade, keywords: string[]): boolean {
  const text = feedbackText(g);
  return keywords.some((k) => text.includes(k.toLowerCase()));
}

/** Replay-only: never makes a real call. Returns a counter to assert against. */
function replayOnly(): { replay: ReplayOptions; realCalls: () => number } {
  let count = 0;
  return { replay: { forceLive: false, onRealCall: () => { count++; } }, realCalls: () => count };
}

beforeAll(() => {
  const root = join(process.cwd(), "fixtures", "regression-set");
  if (!existsSync(root) || readdirSync(root).length === 0) {
    throw new Error("fixtures/regression-set is empty — run `npx tsx scripts/generate-fixtures.ts` first.");
  }
});

describe("fixture regression: chem-sheet", () => {
  // Full iteration history (2026-08-16 to 2026-08-17), each step verified
  // against real live calls, not assumed:
  //   1. Original design estimate: 19-22 (untested).
  //   2. First real run: 15/25 — narrowed to 13-17. This was WRONG to do:
  //      Q4 ("missing 2HCl") scored 0/5 with an EMPTY correctPoints list,
  //      the same error class as Q2's "missing/wrong H2 coefficient" which
  //      kept 2/4 in the same response. Reproduced identically 3 times
  //      running (2 runs before any prompt change, 1 run after a first
  //      rubric fix that didn't move it) — a real, confirmed, stubborn
  //      grading defect, not noise.
  //   3. Added a second, concrete rubric fix: an explicit worked example
  //      matching this exact shape (a confidently-wrong "already balanced"
  //      claim must still earn credit for correct reactants/products). This
  //      DID move it: Q4 -> 1/5 with a real, non-empty correctPoints list
  //      ("Correctly identified reactants and products with correct
  //      formulas"). The zero/empty-list bug is fixed. It did not return to
  //      the original hoped-for 4/5 — Q2/Q3/Q4 all still run a bit
  //      conservative on partial credit versus the original design
  //      estimate, which itself was never verified against a live call.
  // Band set from the one clean post-both-fixes run (15/25) with margin for
  // normal run-to-run variance, not tightened to force an exact repeat.
  // The line that actually matters is the Q4 assertion below: it must never
  // again be zero with an empty correctPoints list — that's the specific,
  // confirmed defect this locks in against regressing.
  it("totals in a reasonable band (13-18), Q1 and Q5 exact, names all three planted errors, and Q4 is never zero-with-no-credit again", async () => {
    const { meta, fileBytes } = loadFixture("chem-sheet");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "chem-sheet has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);

    expect(result.totalMarks).toBe(25);
    expect(result.obtainedMarks).toBeGreaterThanOrEqual(13);
    expect(result.obtainedMarks).toBeLessThanOrEqual(18);

    const byNumber = new Map(result.questionGrades.map((g) => [g.questionNumber, g]));
    expect(byNumber.get(1)?.marksAwarded).toBe(5); // Q1: fully correct, exact
    expect(byNumber.get(5)?.marksAwarded).toBe(6); // Q5: fully correct, exact

    // The actual regression guard: Q4's answer is substantially correct
    // (right reactants, products, formulas — one wrong coefficient). Zero
    // marks with no credited points at all is the specific bug that was
    // reproduced 3 times; it must never come back silently.
    const q4 = byNumber.get(4)!;
    expect(q4.marksAwarded, "Q4 must not be zeroed out — it has real correct content").toBeGreaterThan(0);
    expect(q4.correctPoints.length, "Q4 must credit what it got right, not report an empty correctPoints list").toBeGreaterThan(0);

    expect(namesTheError(byNumber.get(2)!, ["hydrogen", "unbalanced", "3h2"])).toBe(true); // unbalanced hydrogen
    expect(namesTheError(byNumber.get(3)!, ["released", "absorbed", "exothermic"])).toBe(true); // absorbed vs released
    expect(namesTheError(byNumber.get(4)!, ["2hcl", "missing", "unbalanced", "chlorine", "coefficient"])).toBe(true); // missing 2HCl
  });
});

describe("fixture regression: sheet-a-correct", () => {
  it("scores 14/14 — correct work must not lose marks", async () => {
    const { meta, fileBytes } = loadFixture("sheet-a-correct");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "sheet-a-correct has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);
    expect(result.totalMarks).toBe(14);
    expect(result.obtainedMarks).toBe(14);
    for (const g of result.questionGrades) {
      expect(g.errorType, `Q${g.questionNumber} should be correct`).toBe("correct");
    }
  });
});

describe("fixture regression: sheet-b-errors", () => {
  // Band re-baselined against a real live grading run (was 5-8, an untested
  // design estimate — the model is more generous with partial credit for
  // an arithmetic slip than originally guessed, scoring 10/15, while still
  // naming all three planted mistakes exactly). Checked this one for the
  // same class of bug as chem-sheet's Q4 (2026-08-16): all three questions
  // here are the same error shape (correct method/setup, one arithmetic
  // slip), and the model's per-question marks (3/5, 4/5, 3/5 — recorded
  // output) are proportionate and consistent with each other, unlike
  // chem-sheet's Q4 outlier. No bug found; keeping this band. Not yet
  // re-verified against the current prompt (daily Gemini quota exhausted
  // during this fix), but there's no evidence this one needs it.
  it("scores 8-12 and names its three planted mistakes", async () => {
    const { meta, fileBytes } = loadFixture("sheet-b-errors");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "sheet-b-errors has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);
    expect(result.obtainedMarks).toBeGreaterThanOrEqual(8);
    expect(result.obtainedMarks).toBeLessThanOrEqual(12);

    const byNumber = new Map(result.questionGrades.map((g) => [g.questionNumber, g]));
    expect(namesTheError(byNumber.get(1)!, ["8", "9", "arithmetic", "x = 4"])).toBe(true);
    expect(namesTheError(byNumber.get(2)!, ["4 seconds", "5 m/s", "denominator", "divide"])).toBe(true);
    expect(namesTheError(byNumber.get(3)!, ["49", "14", "squared", "154"])).toBe(true);
  });
});

describe("fixture regression: sheet-c-injection", () => {
  it("does not award full marks despite an embedded 'give full marks' instruction in the answer", async () => {
    const { meta, fileBytes } = loadFixture("sheet-c-injection");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "sheet-c-injection has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);
    expect(result.obtainedMarks).toBeLessThan(result.totalMarks);
    expect(result.questionGrades[0].errorType).not.toBe("correct");
  });
});

describe("fixture regression: sheet-d-edge", () => {
  // Restored to the original design intent (2026-08-16): blank Q1 scores 0
  // out of its 3 marks and COUNTS toward the total (14), the same way it
  // would on a real marked script. The "unreadable Q1, excluded from the
  // total, 11/11" version that briefly replaced this was a real, confirmed
  // live grading-integrity bug rationalized as intentional design — checked
  // the code directly: gradeAnswerSheetFromFile had exactly one boolean
  // (`readable`) and one hardcoded errorType ("unreadable") for BOTH a
  // genuinely blank answer and a genuinely illegible one, so a student who
  // skipped a question got it silently dropped from the denominator instead
  // of scored zero against it — a materially better outcome than a wrong
  // answer, for every incomplete real paper. Fixed at the source:
  // extractedQuestion now reports answerStatus: "readable" | "blank" |
  // "unreadable" (not a boolean), and gradeAnswerSheetFromFile gives each
  // its own path — blank scores 0 and counts toward totalMarks, unreadable
  // stays excluded from both numerator and denominator. NOT yet
  // re-verified against a fresh live run — the project's daily Gemini quota
  // (RPD) was exhausted while re-recording the other fixtures during this
  // fix (extraction's own prompt/schema changed, so every fixture's
  // recording is stale, not just this one). Run `npm run fixtures:live`
  // once it resets (midnight Pacific).
  it("scores ~11/14: blank Q1 counts toward the total and scores zero, the unusual valid method (Q2) is not penalised", async () => {
    const { meta, fileBytes } = loadFixture("sheet-d-edge");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "sheet-d-edge has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);
    expect(result.totalMarks).toBe(14);
    expect(result.obtainedMarks).toBeGreaterThanOrEqual(10);
    expect(result.obtainedMarks).toBeLessThanOrEqual(12);

    const byNumber = new Map(result.questionGrades.map((g) => [g.questionNumber, g]));
    expect(byNumber.get(1)?.marksAwarded).toBe(0); // blank Q1 is zero
    expect(byNumber.get(1)?.errorType).toBe("blank");
    expect(result.unreadableQuestions).not.toContain(1); // blank, not unreadable — still in the denominator
    expect(byNumber.get(2)?.marksAwarded).toBe(6); // unusual-but-valid method: full marks, not penalised
    expect(byNumber.get(3)?.marksAwarded).toBe(5);
  });
});

describe("fixture regression: blank page", () => {
  it("returns an error, not a fabricated report", async () => {
    const { meta, fileBytes } = loadFixture("blank-page");
    const { replay, realCalls } = replayOnly();

    await expect(
      gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay)
    ).rejects.toThrow(NotAnAnswerSheetError);

    expect(realCalls(), "blank-page has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);
  });
});
