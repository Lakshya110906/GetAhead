import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { gradeAnswerSheetFromFile } from "../src/lib/answerSheetGrading";
import type { ReplayOptions } from "../src/lib/geminiFixtureCache";

// Runs the named regression fixtures (fixtures/regression-set/<id>/) through
// the real grading pipeline. Default mode replays any already-recorded
// Gemini response from fixtures/gemini-cache/ — zero live calls once
// recorded. --live-fixtures forces every call to hit the real API (and
// re-records), for deliberately re-verifying model behavior after a prompt
// change.
//
// Usage:
//   npx tsx scripts/run-fixtures.ts                 # replay (record on first run)
//   npx tsx scripts/run-fixtures.ts --live-fixtures  # force live calls, re-record

const forceLive = process.argv.includes("--live-fixtures");

interface FixtureMetadata {
  id: string;
  subject: string;
  grade: string;
  examType: string;
  file: string;
  mimeType: string;
}

function loadFixtures(): Array<{ meta: FixtureMetadata; fileBytes: Buffer }> {
  const root = join(process.cwd(), "fixtures", "regression-set");
  if (!existsSync(root)) return [];
  const ids = readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory());
  return ids.map((id) => {
    const dir = join(root, id);
    const meta: FixtureMetadata = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf-8"));
    const fileBytes = readFileSync(join(dir, meta.file));
    return { meta, fileBytes };
  });
}

async function main() {
  const fixtures = loadFixtures();
  if (fixtures.length === 0) {
    console.log("No fixtures found under fixtures/regression-set/.");
    return;
  }

  let realCalls = 0;
  const callLog: string[] = [];
  const replay: ReplayOptions = {
    forceLive,
    onRealCall: (label) => {
      realCalls++;
      callLog.push(label);
    },
  };

  console.log(`Running ${fixtures.length} fixture(s) — mode: ${forceLive ? "LIVE (forced)" : "replay (record on first run)"}\n`);

  for (const { meta, fileBytes } of fixtures) {
    const start = Date.now();
    try {
      const { result } = await gradeAnswerSheetFromFile(
        fileBytes,
        meta.mimeType,
        { subject: meta.subject, grade: meta.grade, examType: meta.examType },
        undefined,
        replay
      );
      const ms = Date.now() - start;
      console.log(
        `  ${meta.id.padEnd(20)} ${result.obtainedMarks}/${result.totalMarks} (${result.grade})  [${ms}ms]  ${result.questionGrades
          .map((g) => g.errorType)
          .join(",")}`
      );
    } catch (err) {
      const ms = Date.now() - start;
      console.log(`  ${meta.id.padEnd(20)} FAILED: ${err instanceof Error ? err.message : String(err)}  [${ms}ms]`);
    }
  }

  console.log(`\nReal Gemini calls made this run: ${realCalls}`);
  if (realCalls > 0) {
    for (const label of callLog) console.log(`  - ${label}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
