import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface AccuracySummary {
  generatedAt: string;
  scoredCases: number;
  mae: number;
  within1Pct: number;
  within2Pct: number;
}

/**
 * Reads the checked-in accuracy baseline (produced by `npm run accuracy:baseline`
 * against fixtures/golden-set/) for display on the marketing site. Returns null
 * until a real golden-set run has produced one — the homepage must never show a
 * number that didn't come from this file.
 */
export function getAccuracyBaseline(): AccuracySummary | null {
  const path = join(process.cwd(), "accuracy-results", "baseline.json");
  if (!existsSync(path)) return null;

  const raw = JSON.parse(readFileSync(path, "utf-8"));
  return {
    generatedAt: raw.generatedAt,
    scoredCases: raw.scoredCases,
    mae: raw.mae,
    within1Pct: raw.within1Pct,
    within2Pct: raw.within2Pct,
  };
}
