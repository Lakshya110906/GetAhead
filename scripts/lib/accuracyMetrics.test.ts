import { describe, it, expect } from "vitest";
import { computeAccuracyReport, checkRegression, CaseResult } from "./accuracyMetrics";

function makeCase(overrides: Partial<CaseResult>): CaseResult {
  return {
    id: "case",
    subject: "Math",
    tags: [],
    teacherMarks: 10,
    aiMarks: 10,
    maxMarks: 10,
    absDiff: 0,
    error: null,
    ...overrides,
  };
}

describe("computeAccuracyReport", () => {
  it("computes MAE and within-1/within-2 percentages across scored cases", () => {
    const cases = [
      makeCase({ id: "a", absDiff: 0 }),
      makeCase({ id: "b", absDiff: 1 }),
      makeCase({ id: "c", absDiff: 2 }),
      makeCase({ id: "d", absDiff: 4 }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.mae).toBe(1.75);
    expect(report.within1Pct).toBe(50);
    expect(report.within2Pct).toBe(75);
    expect(report.scoredCases).toBe(4);
  });

  it("excludes errored cases from the metrics but reports them separately", () => {
    const cases = [
      makeCase({ id: "a", absDiff: 0 }),
      makeCase({ id: "b", error: "Gemini API key is not configured.", aiMarks: NaN, absDiff: NaN }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.scoredCases).toBe(1);
    expect(report.erroredCases).toBe(1);
    expect(report.mae).toBe(0);
  });

  it("ranks worst10 by absolute diff descending", () => {
    const cases = [
      makeCase({ id: "low", absDiff: 0.5 }),
      makeCase({ id: "high", absDiff: 5 }),
      makeCase({ id: "mid", absDiff: 2 }),
    ];
    const report = computeAccuracyReport(cases);
    expect(report.worst10.map((c) => c.id)).toEqual(["high", "mid", "low"]);
  });

  it("breaks down MAE per subject", () => {
    const cases = [
      makeCase({ id: "m1", subject: "Math", absDiff: 0 }),
      makeCase({ id: "m2", subject: "Math", absDiff: 2 }),
      makeCase({ id: "p1", subject: "Physics", absDiff: 4 }),
    ];
    const report = computeAccuracyReport(cases);
    const math = report.bySubject.find((s) => s.subject === "Math")!;
    const physics = report.bySubject.find((s) => s.subject === "Physics")!;
    expect(math.mae).toBe(1);
    expect(physics.mae).toBe(4);
  });
});

describe("checkRegression", () => {
  it("passes when current MAE is within baseline + threshold", () => {
    const report = computeAccuracyReport([makeCase({ absDiff: 1 })]);
    const result = checkRegression(report, { mae: 1 }, 0.5);
    expect(result.regressed).toBe(false);
  });

  it("fails when a prompt regression pushes MAE past baseline + threshold", () => {
    // Simulates the "deliberate prompt regression" scenario: baseline MAE was
    // 1.0, but this run (standing in for a bad prompt edit) came back much worse.
    const regressedCases = [
      makeCase({ id: "a", absDiff: 6 }),
      makeCase({ id: "b", absDiff: 5 }),
    ];
    const report = computeAccuracyReport(regressedCases);
    const result = checkRegression(report, { mae: 1.0 }, 0.5);
    expect(result.regressed).toBe(true);
    expect(result.reason).toMatch(/exceeds baseline/);
  });
});
