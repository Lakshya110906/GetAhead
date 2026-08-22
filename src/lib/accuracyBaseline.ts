import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface AccuracySummary {
  generatedAt: string;
  scoredCases: number;
  comparableQuestions: number;
  mae: number;
  within1Pct: number;
  within2Pct: number;
  fullMarksAgreementPct: number;
  fullMarksQuestionCount: number;
}

/**
 * Reads the checked-in accuracy baseline (produced by `npm run accuracy:baseline`
 * against fixtures/golden-set/ — 30+ real, photographed, independently
 * teacher-marked answer sheets; the harness refuses to write a baseline below
 * that) for display on the marketing site. Returns null until a real
 * golden-set run has produced one — the homepage must never show a number
 * that didn't come from this file, and never a bare point estimate without
 * the sample size attached.
 */
export function getAccuracyBaseline(): AccuracySummary | null {
  const path = join(process.cwd(), "accuracy-results", "baseline.json");
  if (!existsSync(path)) return null;

  const raw = JSON.parse(readFileSync(path, "utf-8"));
  return {
    generatedAt: raw.generatedAt,
    scoredCases: raw.scoredCases,
    comparableQuestions: raw.comparableQuestions,
    mae: raw.mae,
    within1Pct: raw.within1Pct,
    within2Pct: raw.within2Pct,
    fullMarksAgreementPct: raw.fullMarksAgreementPct,
    fullMarksQuestionCount: raw.fullMarksQuestionCount,
  };
}
