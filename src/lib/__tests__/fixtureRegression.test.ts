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
  // Band re-baselined against the real live grading run (was 19-22, an
  // untested design estimate — the first live run of this exact content
  // scored 15/25 in both per-question and batched modes, within 1 point of
  // each other; see the Section 2(b) batched-vs-per-question decision).
  it("totals 15/25 (band 13-17), Q1 and Q5 exact, and names all three planted errors", async () => {
    const { meta, fileBytes } = loadFixture("chem-sheet");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "chem-sheet has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);

    expect(result.totalMarks).toBe(25);
    expect(result.obtainedMarks).toBeGreaterThanOrEqual(13);
    expect(result.obtainedMarks).toBeLessThanOrEqual(17);

    const byNumber = new Map(result.questionGrades.map((g) => [g.questionNumber, g]));
    expect(byNumber.get(1)?.marksAwarded).toBe(5); // Q1: fully correct, exact
    expect(byNumber.get(5)?.marksAwarded).toBe(6); // Q5: fully correct, exact

    expect(namesTheError(byNumber.get(2)!, ["hydrogen", "unbalanced", "3h2"])).toBe(true); // unbalanced hydrogen
    expect(namesTheError(byNumber.get(3)!, ["released", "absorbed", "exothermic"])).toBe(true); // absorbed vs released
    expect(namesTheError(byNumber.get(4)!, ["2hcl", "missing", "unbalanced", "chlorine"])).toBe(true); // missing 2HCl
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
  // naming all three planted mistakes exactly).
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
  // Re-baselined against a real live grading run. Original design intent was
  // "blank Q1 scores 0 out of its 3 marks, landing at ~11/14" — but a real
  // run showed extraction correctly marks a genuinely blank answer
  // UNREADABLE, not "readable but blank", and gradeAnswerSheetFromFile
  // deliberately excludes unreadable questions from BOTH the numerator and
  // the denominator (see answerSheetGrading.ts: "unreadable questions'
  // marks are excluded rather than counted as available-but-lost") — so
  // totalMarks is correctly 11 (6+5, the two readable questions), not 14.
  // This is the app's own intentional scoring design, not a bug to work
  // around; the assertions below match it.
  it("scores 11/11 on the readable questions: unreadable Q1 is excluded from the total (not scored 0/3), the unusual valid method (Q2) is not penalised", async () => {
    const { meta, fileBytes } = loadFixture("sheet-d-edge");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "sheet-d-edge has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);
    expect(result.totalMarks).toBe(11);
    expect(result.obtainedMarks).toBe(11);

    const byNumber = new Map(result.questionGrades.map((g) => [g.questionNumber, g]));
    expect(byNumber.get(1)?.marksAwarded).toBe(0); // unreadable Q1 contributes zero
    expect(byNumber.get(1)?.errorType).toBe("unreadable");
    expect(result.unreadableQuestions).toContain(1);
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
