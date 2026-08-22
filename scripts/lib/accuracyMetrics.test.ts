import { describe, it, expect } from "vitest";
import { computeAccuracyReport, checkRegression, CaseResult, QuestionResult } from "./accuracyMetrics";

function makeQuestion(overrides: Partial<QuestionResult> = {}): QuestionResult {
  return {
    questionNumber: 1,
    maxMarks: 5,
    teacherMarks: 5,
    secondMarkerMarks: null,
    aiMarks: 5,
    extractionFailed: false,
    diff: 0,
    absDiff: 0,
    feedbackNamesError: null,
    ...overrides,
  };
}

function makeCase(overrides: Partial<CaseResult> = {}): CaseResult {
  return {
    id: "case",
    subject: "Math",
    handwritingQuality: "clean",
    tags: [],
    pipelineError: null,
    questions: [makeQuestion()],
    ...overrides,
  };
}

describe("computeAccuracyReport", () => {
  it("computes per-question MAE and within-0/1/2 percentages", () => {
    const cases = [
      makeCase({ id: "a", questions: [makeQuestion({ absDiff: 0, diff: 0 })] }),
      makeCase({ id: "b", questions: [makeQuestion({ absDiff: 1, diff: 1 })] }),
      makeCase({ id: "c", questions: [makeQuestion({ absDiff: 2, diff: -2 })] }),
      makeCase({ id: "d", questions: [makeQuestion({ absDiff: 4, diff: 4 })] }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.mae).toBe(1.75);
    expect(report.within0Pct).toBe(25);
    expect(report.within1Pct).toBe(50);
    expect(report.within2Pct).toBe(75);
    expect(report.comparableQuestions).toBe(4);
  });

  it("excludes pipeline-errored cases from every metric but reports them separately", () => {
    const cases = [
      makeCase({ id: "a", questions: [makeQuestion({ absDiff: 0 })] }),
      makeCase({ id: "b", pipelineError: "Gemini API key is not configured.", questions: [] }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.scoredCases).toBe(1);
    expect(report.pipelineErrorCases).toBe(1);
    expect(report.mae).toBe(0);
    expect(report.pipelineErrorCaseIds).toEqual([{ caseId: "b", error: "Gemini API key is not configured." }]);
  });

  it("counts a question the AI never produced a grade for as an extraction failure, excluded from MAE", () => {
    const cases = [
      makeCase({
        id: "a",
        questions: [
          makeQuestion({ questionNumber: 1, absDiff: 0 }),
          makeQuestion({ questionNumber: 2, extractionFailed: true, aiMarks: null, diff: null, absDiff: null }),
        ],
      }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.totalQuestions).toBe(2);
    expect(report.extractionFailures).toBe(1);
    expect(report.comparableQuestions).toBe(1);
    expect(report.mae).toBe(0);
    expect(report.extractionFailureCases).toEqual([{ caseId: "a", questionNumber: 2 }]);
  });

  it("reports over-marking and under-marking separately, as percentages of comparable questions", () => {
    const cases = [
      makeCase({
        id: "a",
        questions: [
          makeQuestion({ questionNumber: 1, teacherMarks: 3, aiMarks: 3, diff: 0, absDiff: 0 }),
          makeQuestion({ questionNumber: 2, teacherMarks: 2, aiMarks: 4, diff: 2, absDiff: 2 }), // over-marked
          makeQuestion({ questionNumber: 3, teacherMarks: 5, aiMarks: 2, diff: -3, absDiff: 3 }), // under-marked
        ],
      }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.overMarkingRate).toBeCloseTo((1 / 3) * 100, 1);
    expect(report.underMarkingRate).toBeCloseTo((1 / 3) * 100, 1);
  });

  it("computes full-marks agreement only over questions the teacher scored full marks", () => {
    const cases = [
      makeCase({
        id: "a",
        questions: [
          makeQuestion({ questionNumber: 1, maxMarks: 5, teacherMarks: 5, aiMarks: 5, diff: 0, absDiff: 0 }), // agrees
          makeQuestion({ questionNumber: 2, maxMarks: 5, teacherMarks: 5, aiMarks: 4, diff: -1, absDiff: 1 }), // shaved a mark off perfect work
          makeQuestion({ questionNumber: 3, maxMarks: 5, teacherMarks: 3, aiMarks: 3, diff: 0, absDiff: 0 }), // not full marks, irrelevant to this metric
        ],
      }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.fullMarksQuestionCount).toBe(2);
    expect(report.fullMarksAgreementPct).toBe(50);
  });

  it("computes zero agreement only over questions the teacher scored zero", () => {
    const cases = [
      makeCase({
        id: "a",
        questions: [
          makeQuestion({ questionNumber: 1, teacherMarks: 0, aiMarks: 0, diff: 0, absDiff: 0 }),
          makeQuestion({ questionNumber: 2, teacherMarks: 0, aiMarks: 1, diff: 1, absDiff: 1 }),
          makeQuestion({ questionNumber: 3, teacherMarks: 4, aiMarks: 4, diff: 0, absDiff: 0 }),
        ],
      }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.zeroQuestionCount).toBe(2);
    expect(report.zeroAgreementPct).toBe(50);
  });

  it("computes feedback specificity only over questions where it's scorable (not full marks, not extraction-failed)", () => {
    const cases = [
      makeCase({
        id: "a",
        questions: [
          makeQuestion({ questionNumber: 1, teacherMarks: 3, maxMarks: 5, feedbackNamesError: true }),
          makeQuestion({ questionNumber: 2, teacherMarks: 2, maxMarks: 5, feedbackNamesError: false }),
          makeQuestion({ questionNumber: 3, teacherMarks: 5, maxMarks: 5, feedbackNamesError: null }), // full marks, N/A
          makeQuestion({ questionNumber: 4, extractionFailed: true, aiMarks: null, diff: null, absDiff: null, feedbackNamesError: null }),
        ],
      }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.feedbackScorableCount).toBe(2);
    expect(report.feedbackSpecificityPct).toBe(50);
  });

  it("reports inter-marker agreement only over second-marked questions, null when none exist", () => {
    const withSecondMarker = computeAccuracyReport([
      makeCase({
        id: "a",
        questions: [
          makeQuestion({ questionNumber: 1, teacherMarks: 3, secondMarkerMarks: 4 }),
          makeQuestion({ questionNumber: 2, teacherMarks: 5, secondMarkerMarks: null }),
        ],
      }),
    ]);
    expect(withSecondMarker.interMarkerAgreement).toEqual({ questionCount: 1, mae: 1 });

    const withoutSecondMarker = computeAccuracyReport([makeCase({ id: "b" })]);
    expect(withoutSecondMarker.interMarkerAgreement).toBeNull();
  });

  it("breaks down MAE per subject and per handwriting quality independently", () => {
    const cases = [
      makeCase({ id: "m1", subject: "Math", handwritingQuality: "clean", questions: [makeQuestion({ absDiff: 0 })] }),
      makeCase({ id: "m2", subject: "Math", handwritingQuality: "messy", questions: [makeQuestion({ absDiff: 2 })] }),
      makeCase({ id: "p1", subject: "Physics", handwritingQuality: "clean", questions: [makeQuestion({ absDiff: 4 })] }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.bySubject.find((s) => s.label === "Math")!.mae).toBe(1);
    expect(report.bySubject.find((s) => s.label === "Physics")!.mae).toBe(4);
    expect(report.byHandwritingQuality.find((h) => h.label === "clean")!.mae).toBe(2);
    expect(report.byHandwritingQuality.find((h) => h.label === "messy")!.mae).toBe(2);
  });

  it("ranks worst questions by absolute diff descending, across cases", () => {
    const cases = [
      makeCase({ id: "low", questions: [makeQuestion({ absDiff: 0.5 })] }),
      makeCase({ id: "high", questions: [makeQuestion({ absDiff: 5 })] }),
      makeCase({ id: "mid", questions: [makeQuestion({ absDiff: 2 })] }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.worstQuestions.map((q) => q.caseId)).toEqual(["high", "mid", "low"]);
  });
});

describe("checkRegression", () => {
  it("passes when current MAE is within baseline + threshold", () => {
    const report = computeAccuracyReport([makeCase({ questions: [makeQuestion({ absDiff: 1 })] })]);
    const result = checkRegression(report, { mae: 1 }, 0.5);
    expect(result.regressed).toBe(false);
  });

  it("fails when a prompt regression pushes per-question MAE past baseline + threshold", () => {
    const regressedCases = [
      makeCase({ id: "a", questions: [makeQuestion({ absDiff: 6 })] }),
      makeCase({ id: "b", questions: [makeQuestion({ absDiff: 5 })] }),
    ];
    const report = computeAccuracyReport(regressedCases);
    const result = checkRegression(report, { mae: 1.0 }, 0.5);
    expect(result.regressed).toBe(true);
    expect(result.reason).toMatch(/exceeds baseline/);
  });
});
