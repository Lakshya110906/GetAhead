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
//
// ── THE RULE THAT MAKES THIS SUITE WORTH RUNNING (2026-08-17) ───────────────
// Every expected value below comes from independent marking of the fixture
// content — working the answer sheet by hand, the way an actual examiner
// would — never from observing what the grader currently outputs. This
// suite exists to catch the grader disagreeing with a correct mark scheme;
// if an expectation gets quietly moved to match whatever the grader
// happens to return, the suite can no longer detect the thing it exists to
// detect, and a real regression (a subject-agnostic error taxonomy, a
// stubborn zero on a substantially-correct answer, a blank counted as
// unreadable) passes silently. This has actually happened, twice, in this
// file's history: chem-sheet's expectation was moved twice to match live
// grader output (first narrowed to a band of 19-22, then to an outright
// 15/25 in the generator script, both diverging from the fixture's actual
// hand-marked total of 16/25), and sheet-d-edge's expected total was
// changed to match a real code bug that got rationalized as intentional
// design. All were caught and reverted. A live grader run belongs in a
// comment explaining what was found — never in the assertion itself. If a
// fixture's real output lands outside its ground-truth band, that is the
// fixture (or the fixture's documented mark scheme) revealing a defect to
// fix, not evidence the band was wrong.

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

// Stricter than namesTheError: requires every listed concept to be present,
// not just any one of them. Each concept is itself a list of equivalent
// phrasings (so "3H2" and "3 H2" both satisfy the same concept), but a
// question with two required concepts (e.g. Q3's absorbed-vs-released
// contradiction) fails unless BOTH are named — generic feedback that only
// gestures at the topic ("exothermic", "unbalanced") without the specific
// fact no longer passes.
function namesAllOf(g: QuestionGrade, concepts: string[][]): boolean {
  const text = feedbackText(g);
  return concepts.every((phrasings) => phrasings.some((p) => text.includes(p.toLowerCase())));
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
  // Ground truth (independent marking of fixtures/regression-set/chem-sheet/
  // answer-sheet.pdf's own content — see fixtures/regression-set/chem-sheet/
  // answer-key.json, the sole source of these values):
  //   Q1 5/5 exact — correctly balanced, justification correct.
  //   Q2 2/4 — N2 + 2H2 -> 2NH3 needs 3H2; the answer's reasoning only
  //     checks that nitrogen balances and never checks hydrogen.
  //   Q3 2/5 — correctly identifies the reaction as exothermic, but the
  //     explanation reverses absorbed/released and is self-contradictory.
  //   Q4 1/5 — no balancing attempted, falsely claims "already balanced";
  //     needs 2HCl. Marker judgement allows 0-2 here.
  //   Q5 6/6 exact — MgO named, 2Mg + O2 -> 2MgO, justification correct.
  // Total 16/25, band 14-18. Q1 and Q5 have no planted error and must be
  // exact. Generic feedback that merely gestures at the right topic without
  // naming the specific error is a FAIL even if the mark lands in band —
  // see namesAllOf above.
  it("totals 14-18 out of 25, Q1 and Q5 exact, and names all three planted errors specifically", async () => {
    const { meta, fileBytes } = loadFixture("chem-sheet");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "chem-sheet has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);

    expect(result.totalMarks).toBe(25);
    expect(result.obtainedMarks).toBeGreaterThanOrEqual(14);
    expect(result.obtainedMarks).toBeLessThanOrEqual(18);

    const byNumber = new Map(result.questionGrades.map((g) => [g.questionNumber, g]));
    expect(byNumber.get(1)?.marksAwarded).toBe(5); // Q1: fully correct, exact
    expect(byNumber.get(5)?.marksAwarded).toBe(6); // Q5: fully correct, exact

    // Q2: must name the specific missing coefficient (3H2), not just "hydrogen" or "unbalanced" in general.
    expect(namesTheError(byNumber.get(2)!, ["3h2", "3 h2", "three h2"])).toBe(true);
    // Q3: must name BOTH sides of the reversal — "exothermic" alone, or either word by itself, is too generic.
    expect(namesAllOf(byNumber.get(3)!, [["released"], ["absorbed"]])).toBe(true);
    // Q4: must name the specific missing reagent (2HCl), not just "unbalanced" or "coefficient" in general.
    expect(namesTheError(byNumber.get(4)!, ["2hcl", "2 hcl"])).toBe(true);
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
  // Ground truth (independent marking): Q1 3/5 (14-6=8, not 9 — arithmetic
  // slip, method is right), Q2 2/5 (divided by 5 instead of the given 4
  // seconds), Q3 2/5 (7 squared is 49, not 14). Total 7/15, band 5-8.
  //
  // This was briefly widened to 8-12 to match a live run that scored 10/15
  // (2026-08-16) — I judged the grader's marking "internally consistent" at
  // the time and kept the wider band rather than reset it. That judgment
  // call was itself an instance of the exact thing this suite exists to
  // prevent: consistency with itself isn't the same as correctness against
  // an independent mark scheme, and a genuine question-count regression here
  // could hide it. Reset to ground truth.
  it("scores 5-8 and names its three planted mistakes", async () => {
    const { meta, fileBytes } = loadFixture("sheet-b-errors");
    const { replay, realCalls } = replayOnly();
    const { result } = await gradeAnswerSheetFromFile(fileBytes, meta.mimeType, { subject: meta.subject, grade: meta.grade, examType: meta.examType }, undefined, replay);

    expect(realCalls(), "sheet-b-errors has no recording for this exact input — run `npm run fixtures:live` and commit the result").toBe(0);
    expect(result.obtainedMarks).toBeGreaterThanOrEqual(5);
    expect(result.obtainedMarks).toBeLessThanOrEqual(8);

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
