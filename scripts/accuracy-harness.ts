// Runs the full production evaluation pipeline (the same evaluateAnswerSheetFromFile
// call the worker makes) over the golden set and reports how close the AI's marks
// land to the teacher's. This is the only thing standing between a prompt/rubric/
// model tweak and a blind guess about whether it made grading better or worse.
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { loadGoldenSet } from "./lib/goldenSet";
import { computeAccuracyReport, checkRegression, CaseResult, AccuracyReport } from "./lib/accuracyMetrics";
import { evaluateAnswerSheetFromFile, MODEL_ID, PROMPT_VERSION, RUBRIC_VERSION } from "../src/lib/gemini";

const RESULTS_DIR = join(process.cwd(), "accuracy-results");
const LATEST_PATH = join(RESULTS_DIR, "latest.json");
const BASELINE_PATH = join(RESULTS_DIR, "baseline.json");
const DEFAULT_THRESHOLD_MARKS = 0.5;

async function scoreCase(c: Awaited<ReturnType<typeof loadGoldenSet>>[number]): Promise<CaseResult> {
  try {
    const graded = await evaluateAnswerSheetFromFile(c.subject, c.grade, c.examType, c.fileBytes, c.mimeType);
    const aiMarks = graded.result.obtainedMarks;
    return {
      id: c.id,
      subject: c.subject,
      tags: c.tags,
      teacherMarks: c.teacherTotalMarks,
      aiMarks,
      maxMarks: c.maxMarks,
      absDiff: Math.round(Math.abs(aiMarks - c.teacherTotalMarks) * 100) / 100,
      error: null,
    };
  } catch (err) {
    return {
      id: c.id,
      subject: c.subject,
      tags: c.tags,
      teacherMarks: c.teacherTotalMarks,
      aiMarks: NaN,
      maxMarks: c.maxMarks,
      absDiff: NaN,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function printMarkdown(report: AccuracyReport) {
  console.log(`\n# Accuracy report (${report.generatedAt})`);
  console.log(`Model: ${MODEL_ID} | Prompt: ${PROMPT_VERSION.slice(0, 12)} | Rubric: ${RUBRIC_VERSION}\n`);
  console.log(`| Metric | Value |`);
  console.log(`|---|---|`);
  console.log(`| Cases scored | ${report.scoredCases} / ${report.totalCases} |`);
  console.log(`| Mean absolute error (marks) | ${report.mae} |`);
  console.log(`| Within 1 mark | ${report.within1Pct}% |`);
  console.log(`| Within 2 marks | ${report.within2Pct}% |`);
  if (report.erroredCases > 0) console.log(`| Cases that errored | ${report.erroredCases} |`);

  console.log(`\n## Per-subject breakdown\n`);
  console.log(`| Subject | Cases | MAE | Within 1 | Within 2 |`);
  console.log(`|---|---|---|---|---|`);
  for (const s of report.bySubject) {
    console.log(`| ${s.subject} | ${s.count} | ${s.mae} | ${s.within1Pct}% | ${s.within2Pct}% |`);
  }

  console.log(`\n## Worst 10 cases\n`);
  console.log(`| Case | Subject | Teacher | AI | Diff | Tags |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const c of report.worst10) {
    console.log(`| ${c.id} | ${c.subject} | ${c.teacherMarks} | ${c.aiMarks} | ${c.absDiff} | ${c.tags.join(", ")} |`);
  }

  if (report.erroredCases > 0) {
    console.log(`\n## Errored cases\n`);
    for (const c of report.cases.filter((c) => c.error)) {
      console.log(`- ${c.id}: ${c.error}`);
    }
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
      "This gate is a no-op until real teacher-marked answer sheets are added — " +
      "see fixtures/golden-set/README.md for the format. Skipping without failing the build."
    );
    process.exit(0);
  }

  console.log(`Scoring ${goldenSet.length} golden-set case(s) against the live evaluation pipeline...`);
  const results: CaseResult[] = [];
  for (const c of goldenSet) {
    process.stdout.write(`  ${c.id}... `);
    const result = await scoreCase(c);
    console.log(result.error ? `ERROR: ${result.error}` : `teacher=${result.teacherMarks} ai=${result.aiMarks} diff=${result.absDiff}`);
    results.push(result);
  }

  const report = computeAccuracyReport(results);
  printMarkdown(report);

  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(LATEST_PATH, JSON.stringify(report, null, 2) + "\n");

  if (updateBaseline) {
    writeFileSync(BASELINE_PATH, JSON.stringify(report, null, 2) + "\n");
    console.log(`Baseline updated at ${BASELINE_PATH}. Commit this file.`);
    process.exit(0);
  }

  if (!existsSync(BASELINE_PATH)) {
    console.warn(
      `No baseline found at ${BASELINE_PATH}. Run "npm run accuracy:baseline" once real golden-set ` +
      `data exists to establish one — until then, the regression gate can't compare against anything.`
    );
    process.exit(0);
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
  const check = checkRegression(report, baseline, thresholdMarks);
  if (check.regressed) {
    console.error(`\nACCURACY REGRESSION: ${check.reason}`);
    process.exit(1);
  }

  console.log(`OK: MAE ${report.mae} within threshold of baseline MAE ${baseline.mae} (+${thresholdMarks}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
