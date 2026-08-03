export interface CaseResult {
  id: string;
  subject: string;
  tags: string[];
  teacherMarks: number;
  aiMarks: number;
  maxMarks: number;
  absDiff: number;
  error: string | null;
}

export interface SubjectBreakdown {
  subject: string;
  count: number;
  mae: number;
  within1Pct: number;
  within2Pct: number;
}

export interface AccuracyReport {
  generatedAt: string;
  totalCases: number;
  scoredCases: number;
  erroredCases: number;
  mae: number;
  within1Pct: number;
  within2Pct: number;
  worst10: CaseResult[];
  bySubject: SubjectBreakdown[];
  cases: CaseResult[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Pure aggregation over already-computed per-case results — no I/O, no model calls. */
export function computeAccuracyReport(cases: CaseResult[]): AccuracyReport {
  const scored = cases.filter((c) => c.error === null);
  const errored = cases.filter((c) => c.error !== null);

  const mae = scored.length ? round2(scored.reduce((s, c) => s + c.absDiff, 0) / scored.length) : 0;
  const within1Pct = scored.length
    ? round2((scored.filter((c) => c.absDiff <= 1).length / scored.length) * 100)
    : 0;
  const within2Pct = scored.length
    ? round2((scored.filter((c) => c.absDiff <= 2).length / scored.length) * 100)
    : 0;

  const worst10 = [...scored].sort((a, b) => b.absDiff - a.absDiff).slice(0, 10);

  const subjects = Array.from(new Set(scored.map((c) => c.subject))).sort();
  const bySubject: SubjectBreakdown[] = subjects.map((subject) => {
    const subCases = scored.filter((c) => c.subject === subject);
    return {
      subject,
      count: subCases.length,
      mae: round2(subCases.reduce((s, c) => s + c.absDiff, 0) / subCases.length),
      within1Pct: round2((subCases.filter((c) => c.absDiff <= 1).length / subCases.length) * 100),
      within2Pct: round2((subCases.filter((c) => c.absDiff <= 2).length / subCases.length) * 100),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    scoredCases: scored.length,
    erroredCases: errored.length,
    mae,
    within1Pct,
    within2Pct,
    worst10,
    bySubject,
    cases,
  };
}

export interface RegressionCheckResult {
  regressed: boolean;
  reason: string | null;
}

/**
 * The CI gate: current MAE must not exceed baseline MAE by more than
 * `thresholdMarks`. Widening within1Pct/within2Pct is not itself a failure —
 * MAE is the single number this gate protects, deliberately, so one metric
 * can't be gamed against another.
 */
export function checkRegression(
  current: AccuracyReport,
  baseline: { mae: number },
  thresholdMarks: number
): RegressionCheckResult {
  const allowedMae = baseline.mae + thresholdMarks;
  if (current.mae > allowedMae) {
    return {
      regressed: true,
      reason: `MAE ${current.mae} exceeds baseline ${baseline.mae} + threshold ${thresholdMarks} = ${round2(allowedMae)}`,
    };
  }
  return { regressed: false, reason: null };
}
