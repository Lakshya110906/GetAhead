import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { gradeAnswerSheetFromFile, type GradingMode } from "../src/lib/answerSheetGrading";
import type { ReplayOptions } from "../src/lib/geminiFixtureCache";
import type { QuestionGrade } from "../src/lib/answerSheetSchema";

// Section 2(b): does one batched call for the whole sheet give comparable
// quality to one isolated call per question? Runs BOTH modes against every
// regression fixture (replaying cached extraction/grading where available,
// recording anything new) and scores against a hand-defined answer key
// where one exists (chem-sheet, sheet-b-errors).

const forceLive = process.argv.includes("--live-fixtures");

interface FixtureMetadata {
  id: string;
  subject: string;
  grade: string;
  examType: string;
  file: string;
  mimeType: string;
}

interface AnswerKeyQuestion {
  questionNumber: number;
  expectedMarks: number;
  expectedMaxMarks: number;
  errorType: string;
  plantedError: string | null;
  keywords: string[];
}

interface AnswerKey {
  id: string;
  totalMarks: number;
  expectedObtainedMarks: number;
  questions: AnswerKeyQuestion[];
}

function loadFixtures(): Array<{ meta: FixtureMetadata; fileBytes: Buffer; answerKey: AnswerKey | null }> {
  const root = join(process.cwd(), "fixtures", "regression-set");
  const ids = readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory());
  return ids.map((id) => {
    const dir = join(root, id);
    const meta: FixtureMetadata = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf-8"));
    const fileBytes = readFileSync(join(dir, meta.file));
    const keyPath = join(dir, "answer-key.json");
    const answerKey: AnswerKey | null = existsSync(keyPath) ? JSON.parse(readFileSync(keyPath, "utf-8")) : null;
    return { meta, fileBytes, answerKey };
  });
}

function feedbackText(g: QuestionGrade): string {
  return [g.feedback, ...g.correctPoints, ...g.incorrectPoints, g.groundingQuote].join(" ").toLowerCase();
}

function namesTheError(g: QuestionGrade, keywords: string[]): boolean {
  if (keywords.length === 0) return true; // nothing planted to name
  const text = feedbackText(g);
  return keywords.some((k) => text.includes(k.toLowerCase()));
}

async function runMode(
  mode: GradingMode,
  fileBytes: Buffer,
  meta: FixtureMetadata
): Promise<{ grades: QuestionGrade[]; obtainedMarks: number; totalMarks: number; realCalls: number; ms: number }> {
  let realCalls = 0;
  const replay: ReplayOptions = { forceLive, onRealCall: () => realCalls++ };
  const start = Date.now();
  const { result } = await gradeAnswerSheetFromFile(
    fileBytes,
    meta.mimeType,
    { subject: meta.subject, grade: meta.grade, examType: meta.examType },
    undefined,
    replay,
    mode
  );
  return { grades: result.questionGrades, obtainedMarks: result.obtainedMarks, totalMarks: result.totalMarks, realCalls, ms: Date.now() - start };
}

async function main() {
  const fixtures = loadFixtures();
  const rows: string[] = [];

  for (const { meta, fileBytes, answerKey } of fixtures) {
    console.log(`\n=== ${meta.id} ===`);
    const perQ = await runMode("per-question", fileBytes, meta);
    const batched = await runMode("batched", fileBytes, meta);

    console.log(`  per-question: ${perQ.obtainedMarks}/${perQ.totalMarks}  calls=${perQ.realCalls}  ${perQ.ms}ms`);
    console.log(`  batched:      ${batched.obtainedMarks}/${batched.totalMarks}  calls=${batched.realCalls}  ${batched.ms}ms`);

    for (let i = 0; i < perQ.grades.length; i++) {
      const pg = perQ.grades[i];
      const bg = batched.grades.find((g) => g.questionNumber === pg.questionNumber);
      const key = answerKey?.questions.find((k) => k.questionNumber === pg.questionNumber) ?? null;

      const perQNamed = key ? namesTheError(pg, key.keywords) : null;
      const batchedNamed = key && bg ? namesTheError(bg, key.keywords) : null;

      const line =
        `  Q${pg.questionNumber}: ` +
        `expected=${key ? `${key.expectedMarks}/${key.expectedMaxMarks} (${key.errorType})` : "n/a"} | ` +
        `per-question=${pg.marksAwarded}/${pg.marksAvailable} (${pg.errorType})${key ? (perQNamed ? " [named]" : " [NOT NAMED]") : ""} | ` +
        `batched=${bg ? `${bg.marksAwarded}/${bg.marksAvailable} (${bg.errorType})` : "MISSING"}${key ? (batchedNamed ? " [named]" : " [NOT NAMED]") : ""}`;
      console.log(line);
      rows.push(`${meta.id},${pg.questionNumber},${key?.expectedMarks ?? ""},${pg.marksAwarded},${bg?.marksAwarded ?? ""},${perQNamed},${batchedNamed}`);

      if (key?.plantedError) {
        console.log(`      planted: ${key.plantedError}`);
        console.log(`      per-question feedback: ${pg.feedback}`);
        console.log(`      batched feedback:      ${bg?.feedback ?? "—"}`);
      }
    }
  }

  console.log("\n\n=== CSV (fixture,question,expected,perQuestionMarks,batchedMarks,perQuestionNamed,batchedNamed) ===");
  console.log(rows.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
