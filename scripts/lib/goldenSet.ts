import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { z } from "zod";

// A case is "hard" for a specific, named reason — these tags are what let the
// harness (and a human reading the worst-10 list) tell "the model is bad at
// messy handwriting" apart from "the model is bad at everything."
export const GOLDEN_CASE_TAGS = [
  "clean-handwriting",
  "messy-handwriting",
  "typed",
  "short-answer",
  "long-answer",
  "partially-correct",
  "correct-unexpected-method",
  "blank-answer",
  "injected-instructions",
] as const;

export type GoldenCaseTag = (typeof GOLDEN_CASE_TAGS)[number];

export const HANDWRITING_QUALITIES = ["typed", "clean", "average", "messy"] as const;
export type HandwritingQuality = (typeof HANDWRITING_QUALITIES)[number];

// One ground-truth question, marked independently by a human WITHOUT seeing
// the AI's output (marking after seeing the AI's marks anchors the human and
// destroys the baseline — see fixtures/golden-set/README.md). errorKeywords
// is the same discipline fixtureRegression.test.ts already uses for its
// namesTheError() check: a short list of specific phrases a genuinely
// specific explanation of THIS error would have to contain. Required
// whenever teacherMarks < maxMarks (there IS an error to name); leave it out
// for a fully-correct question.
const goldenQuestionSchema = z
  .object({
    questionNumber: z.number().int().positive(),
    maxMarks: z.number().positive(),
    teacherMarks: z.number().min(0),
    secondMarkerMarks: z.number().min(0).nullable().optional().default(null),
    errorKeywords: z.array(z.string().min(1)).optional().default([]),
  })
  .refine((q) => q.teacherMarks <= q.maxMarks, {
    message: "teacherMarks cannot exceed maxMarks",
  })
  .refine((q) => q.teacherMarks >= q.maxMarks || q.errorKeywords.length > 0, {
    message: "a question marked below full marks needs errorKeywords — otherwise feedback specificity can't be scored for it",
  });

export type GoldenQuestion = z.infer<typeof goldenQuestionSchema>;

const metadataSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  examType: z.string().min(1),
  file: z.string().min(1),
  mimeType: z.string().min(1),
  // "photographed" is the point of this fixture set — a scanned/rendered
  // sheet belongs in fixtures/regression-set instead. false is allowed only
  // for a deliberate, tagged exception (e.g. a typed PDF a real user
  // actually submitted), never as the default.
  photographed: z.boolean(),
  handwritingQuality: z.enum(HANDWRITING_QUALITIES),
  language: z.string().min(1).default("English"),
  tags: z.array(z.enum(GOLDEN_CASE_TAGS)).min(1),
  markedBy: z.string().min(1),
  secondMarkedBy: z.string().optional(),
  notes: z.string().optional().default(""),
  questions: z.array(goldenQuestionSchema).min(1),
});

export type GoldenCaseMetadata = z.infer<typeof metadataSchema>;

export interface GoldenCase extends GoldenCaseMetadata {
  dir: string;
  fileBytes: Buffer;
}

const GOLDEN_SET_ROOT = join(process.cwd(), "fixtures", "golden-set");

/**
 * Loads every fixture under fixtures/golden-set/<case-id>/metadata.json.
 * Each case directory is self-contained: the metadata file plus the answer
 * sheet file it points to. An empty golden set is valid (repo state before
 * real teacher-marked sheets have been dropped in) — callers decide what to
 * do about that, this loader just reports it as zero cases.
 */
export function loadGoldenSet(): GoldenCase[] {
  if (!existsSync(GOLDEN_SET_ROOT)) return [];

  const entries = readdirSync(GOLDEN_SET_ROOT).filter((name) =>
    statSync(join(GOLDEN_SET_ROOT, name)).isDirectory()
  );

  const cases: GoldenCase[] = [];
  for (const dirName of entries) {
    const dir = join(GOLDEN_SET_ROOT, dirName);
    const metadataPath = join(dir, "metadata.json");
    if (!existsSync(metadataPath)) continue;

    const raw = JSON.parse(readFileSync(metadataPath, "utf-8"));
    const metadata = metadataSchema.parse(raw);
    const filePath = join(dir, metadata.file);
    if (!existsSync(filePath)) {
      throw new Error(`Golden case "${metadata.id}" points at missing file: ${filePath}`);
    }

    cases.push({
      ...metadata,
      dir,
      fileBytes: readFileSync(filePath),
    });
  }

  // Deterministic order so the harness output is diffable run-to-run.
  return cases.sort((a, b) => a.id.localeCompare(b.id));
}
