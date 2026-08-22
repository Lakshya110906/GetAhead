import type { HandwritingQuality } from "./goldenSet";

// One ground-truth question compared against the AI's grade for the same
// question number. aiMarks/diff/absDiff/feedbackNamesError are all null when
// extractionFailed is true — there is nothing to compare a mark or a
// feedback string against if the AI never produced an entry for this
// question at all (as opposed to producing one and grading it "unreadable",
// which is a real AI answer, just a self-reported one).
export interface QuestionResult {
  questionNumber: number;
  maxMarks: number;
  teacherMarks: number;
  secondMarkerMarks: number | null;
  aiMarks: number | null;
  extractionFailed: boolean;
  diff: number | null; // aiMarks - teacherMarks, signed: positive = over-marked
  absDiff: number | null;
  feedbackNamesError: boolean | null; // null when N/A (full marks, or extraction failed)
}

export interface CaseResult {
  id: string;
  subject: string;
  handwritingQuality: HandwritingQuality;
  tags: string[];
  pipelineError: string | null; // the whole pipeline crashed for this case (distinct from a per-question extraction failure)
  questions: QuestionResult[];
}

export interface GroupBreakdown {
  label: string;
  questionCount: number;
  mae: number;
  within0Pct: number;
  within1Pct: number;
  within2Pct: number;
}

export interface AccuracyReport {
  generatedAt: string;

  // Sample sizes — every figure below is meaningless without these attached.
  totalCases: number;
  scoredCases: number;
  pipelineErrorCases: number;
  totalQuestions: number;
  extractionFailures: number;
  comparableQuestions: number; // totalQuestions - extractionFailures; the denominator for every mark-based metric below

  // Core per-question accuracy (3c) — computed over comparableQuestions only.
  mae: number;
  within0Pct: number;
  within1Pct: number;
  within2Pct: number;

  // Over- vs under-marking are NOT symmetric: a student under-marked lost
  // something they earned. Both are a percentage of comparableQuestions
  // whose diff wasn't exactly 0.
  overMarkingRate: number;
  underMarkingRate: number;

  // Of the questions the teacher scored full marks, what fraction did the AI
  // also score full marks? An over-cautious grader that shaves marks off
  // perfect work shows up here, not in MAE (a 1-mark shave on a full-marks
  // question and a 1-mark shave on a partial-credit question look identical
  // to MAE, but only one of them is "penalizing correct work").
  fullMarksAgreementPct: number;
  fullMarksQuestionCount: number;

  // Of the questions the teacher scored zero, what fraction did the AI also
  // score zero?
  zeroAgreementPct: number;
  zeroQuestionCount: number;

  // Of the non-full-marks, non-extraction-failed questions (there's an error
  // to name and an AI answer to check), what fraction of the AI's feedback
  // actually named it (matched against the human's errorKeywords), vs a
  // question with no keywords at all (can't be scored, excluded from the
  // denominator rather than counted as a miss).
  feedbackSpecificityPct: number;
  feedbackScorableCount: number;

  // Only present when at least one question in the set has a
  // secondMarkerMarks — the floor on what any grader (human or AI) can
  // achieve, reported the same way (MAE) as the AI-vs-primary-marker figure
  // so the two are directly comparable.
  interMarkerAgreement: { questionCount: number; mae: number } | null;

  bySubject: GroupBreakdown[];
  byHandwritingQuality: GroupBreakdown[];

  worstQuestions: (QuestionResult & { caseId: string })[];
  extractionFailureCases: { caseId: string; questionNumber: number }[];
  pipelineErrorCaseIds: { caseId: string; error: string }[];

  cases: CaseResult[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? round2((numerator / denominator) * 100) : 0;
}

function questionMetrics(questions: QuestionResult[]): Omit<GroupBreakdown, "label" | "questionCount"> {
  const comparable = questions.filter((q) => !q.extractionFailed);
  const mae = comparable.length
    ? round2(comparable.reduce((s, q) => s + (q.absDiff ?? 0), 0) / comparable.length)
    : 0;
  return {
    mae,
    within0Pct: pct(comparable.filter((q) => (q.absDiff ?? Infinity) <= 0).length, comparable.length),
    within1Pct: pct(comparable.filter((q) => (q.absDiff ?? Infinity) <= 1).length, comparable.length),
    within2Pct: pct(comparable.filter((q) => (q.absDiff ?? Infinity) <= 2).length, comparable.length),
  };
}

/** Pure aggregation over already-computed per-case results — no I/O, no model calls. */
export function computeAccuracyReport(cases: CaseResult[]): AccuracyReport {
  const scored = cases.filter((c) => c.pipelineError === null);
  const pipelineErrored = cases.filter((c) => c.pipelineError !== null);

  const allQuestions = scored.flatMap((c) => c.questions);
  const extractionFailed = allQuestions.filter((q) => q.extractionFailed);
  const comparable = allQuestions.filter((q) => !q.extractionFailed);

  const nonZeroDiff = comparable.filter((q) => (q.absDiff ?? 0) > 0);
  const overMarked = nonZeroDiff.filter((q) => (q.diff ?? 0) > 0);
  const underMarked = nonZeroDiff.filter((q) => (q.diff ?? 0) < 0);

  const fullMarksQuestions = comparable.filter((q) => q.teacherMarks >= q.maxMarks);
  const fullMarksAgreed = fullMarksQuestions.filter((q) => (q.aiMarks ?? -1) >= q.maxMarks);

  const zeroQuestions = comparable.filter((q) => q.teacherMarks === 0);
  const zeroAgreed = zeroQuestions.filter((q) => (q.aiMarks ?? -1) === 0);

  const feedbackScorable = comparable.filter((q) => q.feedbackNamesError !== null);
  const feedbackNamed = feedbackScorable.filter((q) => q.feedbackNamesError === true);

  const secondMarked = allQuestions.filter((q) => q.secondMarkerMarks !== null && !q.extractionFailed);
  const interMarkerAgreement = secondMarked.length
    ? {
        questionCount: secondMarked.length,
        mae: round2(
          secondMarked.reduce((s, q) => s + Math.abs((q.secondMarkerMarks as number) - q.teacherMarks), 0) /
            secondMarked.length
        ),
      }
    : null;

  const core = questionMetrics(allQuestions);

  const subjects = Array.from(new Set(scored.map((c) => c.subject))).sort();
  const bySubject: GroupBreakdown[] = subjects.map((subject) => {
    const qs = scored.filter((c) => c.subject === subject).flatMap((c) => c.questions);
    return { label: subject, questionCount: qs.length, ...questionMetrics(qs) };
  });

  const qualities = Array.from(new Set(scored.map((c) => c.handwritingQuality))).sort();
  const byHandwritingQuality: GroupBreakdown[] = qualities.map((quality) => {
    const qs = scored.filter((c) => c.handwritingQuality === quality).flatMap((c) => c.questions);
    return { label: quality, questionCount: qs.length, ...questionMetrics(qs) };
  });

  const worstQuestions = scored
    .flatMap((c) => c.questions.map((q) => ({ ...q, caseId: c.id })))
    .filter((q) => !q.extractionFailed)
    .sort((a, b) => (b.absDiff ?? 0) - (a.absDiff ?? 0))
    .slice(0, 15);

  const extractionFailureCases = scored.flatMap((c) =>
    c.questions.filter((q) => q.extractionFailed).map((q) => ({ caseId: c.id, questionNumber: q.questionNumber }))
  );

  const pipelineErrorCaseIds = pipelineErrored.map((c) => ({ caseId: c.id, error: c.pipelineError as string }));

  return {
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    scoredCases: scored.length,
    pipelineErrorCases: pipelineErrored.length,
    totalQuestions: allQuestions.length,
    extractionFailures: extractionFailed.length,
    comparableQuestions: comparable.length,

    mae: core.mae,
    within0Pct: core.within0Pct,
    within1Pct: core.within1Pct,
    within2Pct: core.within2Pct,

    overMarkingRate: pct(overMarked.length, comparable.length),
    underMarkingRate: pct(underMarked.length, comparable.length),

    fullMarksAgreementPct: pct(fullMarksAgreed.length, fullMarksQuestions.length),
    fullMarksQuestionCount: fullMarksQuestions.length,

    zeroAgreementPct: pct(zeroAgreed.length, zeroQuestions.length),
    zeroQuestionCount: zeroQuestions.length,

    feedbackSpecificityPct: pct(feedbackNamed.length, feedbackScorable.length),
    feedbackScorableCount: feedbackScorable.length,

    interMarkerAgreement,

    bySubject,
    byHandwritingQuality,

    worstQuestions,
    extractionFailureCases,
    pipelineErrorCaseIds,

    cases,
  };
}

export interface RegressionCheckResult {
  regressed: boolean;
  reason: string | null;
}

/**
 * The CI gate: current per-question MAE must not exceed baseline MAE by more
 * than `thresholdMarks`. MAE is the single number this gate protects,
 * deliberately, so no other metric can be gamed against it — e.g. a change
 * that raises full-marks-agreement while quietly widening MAE elsewhere
 * still fails here.
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
      reason: `Per-question MAE ${current.mae} exceeds baseline ${baseline.mae} + threshold ${thresholdMarks} = ${round2(allowedMae)}`,
    };
  }
  return { regressed: false, reason: null };
}
