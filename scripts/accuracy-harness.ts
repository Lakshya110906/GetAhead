// Runs the full production evaluation pipeline (the same gradeAnswerSheetFromFile
// call the worker makes) over the golden set and reports how close the AI's marks
// land to a human teacher's, per question. This is the only thing standing between
// a prompt/rubric/model tweak and a blind guess about whether it made grading
// better or worse — and the only source of truth this repo has for "is the AI
// accurate," as opposed to fixtures/regression-set's "did the AI regress."
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { loadGoldenSet, GoldenCase } from "./lib/goldenSet";
import { computeAccuracyReport, checkRegression, CaseResult, QuestionResult, AccuracyReport } from "./lib/accuracyMetrics";
import { gradeAnswerSheetFromFile, MODEL_ID, EXTRACTION_PROMPT_VERSION, GRADE_PROMPT_VERSION } from "../src/lib/answerSheetGrading";
import type { QuestionGrade } from "../src/lib/answerSheetSchema";

const RESULTS_DIR = join(process.cwd(), "accuracy-results");
const LATEST_PATH = join(RESULTS_DIR, "latest.json");
const BASELINE_PATH = join(RESULTS_DIR, "baseline.json");
const DEFAULT_THRESHOLD_MARKS = 0.5;

// Same discipline fixtureRegression.test.ts's namesTheError() uses: the
// human decides, at marking time, what specific phrases a genuinely
// specific explanation of THIS error would have to contain. Matching here
// is mechanical on purpose — it can't be talked into a false positive the
// way a second AI judging the first AI's feedback could.
function feedbackText(g: QuestionGrade): string {
  return [g.feedback, g.errorCategory ?? "", ...g.correctPoints, ...g.incorrectPoints, g.groundingQuote].join(" ").toLowerCase();
}

function namesTheError(g: QuestionGrade, keywords: string[]): boolean {
  const text = feedbackText(g);
  return keywords.some((k) => text.includes(k.toLowerCase()));
}

function scoreQuestions(c: GoldenCase, grades: QuestionGrade[]): QuestionResult[] {
  return c.questions.map((q) => {
    const ai = grades.find((g) => g.questionNumber === q.questionNumber);

    if (!ai) {
      return {
        questionNumber: q.questionNumber,
        maxMarks: q.maxMarks,
        teacherMarks: q.teacherMarks,
        secondMarkerMarks: q.secondMarkerMarks,
        aiMarks: null,
        extractionFailed: true,
        diff: null,
        absDiff: null,
        feedbackNamesError: null,
      };
    }

    const diff = Math.round((ai.marksAwarded - q.teacherMarks) * 100) / 100;
    const isFullMarks = q.teacherMarks >= q.maxMarks;
    const feedbackNamesErrorResult = !isFullMarks && q.errorKeywords.length > 0 ? namesTheError(ai, q.errorKeywords) : null;

    return {
      questionNumber: q.questionNumber,
      maxMarks: q.maxMarks,
      teacherMarks: q.teacherMarks,
      secondMarkerMarks: q.secondMarkerMarks,
      aiMarks: ai.marksAwarded,
      extractionFailed: false,
      diff,
      absDiff: Math.abs(diff),
      feedbackNamesError: feedbackNamesErrorResult,
    };
  });
}

async function scoreCase(c: GoldenCase): Promise<CaseResult> {
  const base = { id: c.id, subject: c.subject, handwritingQuality: c.handwritingQuality, tags: c.tags };
  try {
    const graded = await gradeAnswerSheetFromFile(c.fileBytes, c.mimeType, { subject: c.subject, grade: c.grade, examType: c.examType });
    return { ...base, pipelineError: null, questions: scoreQuestions(c, graded.result.questionGrades) };
  } catch (err) {
    return { ...base, pipelineError: err instanceof Error ? err.message : String(err), questions: [] };
  }
}

function printMarkdown(report: AccuracyReport) {
  console.log(`\n# Accuracy report (${report.generatedAt})`);
  console.log(`Model: ${MODEL_ID} | Extraction prompt: ${EXTRACTION_PROMPT_VERSION.slice(0, 12)} | Grade prompt: ${GRADE_PROMPT_VERSION.slice(0, 12)}\n`);

  console.log(`Sample: ${report.scoredCases}/${report.totalCases} cases scored, ${report.comparableQuestions}/${report.totalQuestions} questions comparable.`);
  if (report.totalCases < 30) {
    console.log(`\n**WARNING: fewer than 30 cases — this sample cannot support any figure worth publishing. Do not cite these numbers externally.**`);
  }

  console.log(`\n| Metric | Value | n |`);
  console.log(`|---|---|---|`);
  console.log(`| Mean absolute error (marks/question) | ${report.mae} | ${report.comparableQuestions} |`);
  console.log(`| Exact match (within 0) | ${report.within0Pct}% | ${report.comparableQuestions} |`);
  console.log(`| Within 1 mark | ${report.within1Pct}% | ${report.comparableQuestions} |`);
  console.log(`| Within 2 marks | ${report.within2Pct}% | ${report.comparableQuestions} |`);
  console.log(`| Over-marking rate | ${report.overMarkingRate}% | ${report.comparableQuestions} |`);
  console.log(`| Under-marking rate | ${report.underMarkingRate}% | ${report.comparableQuestions} |`);
  console.log(`| Full-marks agreement | ${report.fullMarksAgreementPct}% | ${report.fullMarksQuestionCount} |`);
  console.log(`| Zero agreement | ${report.zeroAgreementPct}% | ${report.zeroQuestionCount} |`);
  console.log(`| Feedback specificity | ${report.feedbackSpecificityPct}% | ${report.feedbackScorableCount} |`);
  console.log(`| Extraction failure rate | ${report.extractionFailures}/${report.totalQuestions} |  |`);
  console.log(`| Pipeline failures (whole case) | ${report.pipelineErrorCases}/${report.totalCases} |  |`);

  if (report.interMarkerAgreement) {
    console.log(
      `\nInter-marker agreement (floor on what any grader can achieve): MAE ${report.interMarkerAgreement.mae} over ${report.interMarkerAgreement.questionCount} double-marked question(s).`
    );
  } else {
    console.log(`\nNo double-marked questions yet — inter-marker disagreement (the floor on what any grader can achieve) is unmeasured.`);
  }

  console.log(`\n## By subject\n`);
  console.log(`| Subject | Questions | MAE | Within 0 | Within 1 | Within 2 |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const s of report.bySubject) {
    console.log(`| ${s.label} | ${s.questionCount} | ${s.mae} | ${s.within0Pct}% | ${s.within1Pct}% | ${s.within2Pct}% |`);
  }

  console.log(`\n## By handwriting quality\n`);
  console.log(`| Quality | Questions | MAE | Within 0 | Within 1 | Within 2 |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const h of report.byHandwritingQuality) {
    console.log(`| ${h.label} | ${h.questionCount} | ${h.mae} | ${h.within0Pct}% | ${h.within1Pct}% | ${h.within2Pct}% |`);
  }

  console.log(`\n## Worst 15 questions\n`);
  console.log(`| Case | Q# | Teacher | AI | Diff |`);
  console.log(`|---|---|---|---|---|`);
  for (const q of report.worstQuestions) {
    console.log(`| ${q.caseId} | ${q.questionNumber} | ${q.teacherMarks} | ${q.aiMarks} | ${q.diff} |`);
  }

  if (report.extractionFailureCases.length > 0) {
    console.log(`\n## Extraction failures (AI never produced a grade for this question)\n`);
    for (const f of report.extractionFailureCases) console.log(`- ${f.caseId} Q${f.questionNumber}`);
  }

  if (report.pipelineErrorCaseIds.length > 0) {
    console.log(`\n## Pipeline failures (whole case crashed)\n`);
    for (const f of report.pipelineErrorCaseIds) console.log(`- ${f.caseId}: ${f.error}`);
  }
  console.log("");
}

async function main() {
  const updateBaseline = process.argv.includes("--update-baseline");
  const thresholdMarks = Number(process.env.ACCURACY_MAE_REGRESSION_THRESHOLD || DEFAULT_THRESHOLD_MARKS);

  const goldenSet = loadGoldenSet();

  if (goldenSet.length === 0) {
    console.warn(
      "No golden-set fixtures found under fixtures/golden-set/. " +
      "This gate is a no-op until real, photographed, independently teacher-marked answer sheets are added — " +
      "see fixtures/golden-set/README.md for the format. Skipping without failing the build."
    );
    process.exit(0);
  }

  console.log(`Scoring ${goldenSet.length} golden-set case(s) against the live evaluation pipeline...`);
  const results: CaseResult[] = [];
  for (const c of goldenSet) {
    process.stdout.write(`  ${c.id}... `);
    const result = await scoreCase(c);
    console.log(
      result.pipelineError
        ? `PIPELINE ERROR: ${result.pipelineError}`
        : `${result.questions.length} question(s) scored`
    );
    results.push(result);
  }

  const report = computeAccuracyReport(results);
  printMarkdown(report);

  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(LATEST_PATH, JSON.stringify(report, null, 2) + "\n");

  if (updateBaseline) {
    if (report.totalCases < 30) {
      console.error(
        `Refusing to write a baseline from ${report.totalCases} case(s) — fewer than 30 cannot support any figure worth ` +
        `publishing (see fixtures/golden-set/README.md). Add more cases before running --update-baseline.`
      );
      process.exit(1);
    }
    writeFileSync(BASELINE_PATH, JSON.stringify(report, null, 2) + "\n");
    console.log(`Baseline updated at ${BASELINE_PATH}. Commit this file.`);
    process.exit(0);
  }

  if (!existsSync(BASELINE_PATH)) {
    console.warn(
      `No baseline found at ${BASELINE_PATH}. Run "npm run accuracy:baseline" once real golden-set ` +
      `data (30+ cases) exists to establish one — until then, the regression gate can't compare against anything.`
    );
    process.exit(0);
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
  const check = checkRegression(report, baseline, thresholdMarks);
  if (check.regressed) {
    console.error(`\nACCURACY REGRESSION: ${check.reason}`);
    process.exit(1);
  }

  console.log(`OK: per-question MAE ${report.mae} within threshold of baseline MAE ${baseline.mae} (+${thresholdMarks}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
