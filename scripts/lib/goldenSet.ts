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

const metadataSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  examType: z.string().min(1),
  file: z.string().min(1),
  mimeType: z.string().min(1),
  teacherTotalMarks: z.number().min(0),
  maxMarks: z.number().positive(),
  tags: z.array(z.enum(GOLDEN_CASE_TAGS)).min(1),
  markedBy: z.string().min(1),
  notes: z.string().optional().default(""),
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
