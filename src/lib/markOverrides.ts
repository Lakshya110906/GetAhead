import { z } from "zod";
import type { QuestionGrade } from "@/lib/answerSheetSchema";

// Human-in-the-loop marking.
//
// Every comparable tool in this category (Gradescope, CoGrader, Crowdmark)
// treats the AI's mark as a FIRST DRAFT that a person confirms or changes —
// CoGrader will not even allow bulk approval. GetAhead showed the AI's marks
// as final with no way to disagree, which sits badly with the rest of this
// codebase: the grader is measurably not repeatable (see gradingCache.ts),
// every mark is deliberately grounded in a quote so a teacher CAN check it,
// and until now there was nothing to do when that check failed.
//
// The rule here is the same one the fixture suite lives by: never overwrite
// the model's own record. aiResponse keeps exactly what the model said; a
// person's disagreement is a separate layer on top, always visibly labelled,
// always reversible.

export const markOverrideSchema = z.object({
  questionNumber: z.number().int().positive(),
  // null clears the override and restores the AI's mark.
  marks: z.number().min(0).nullable(),
  note: z.string().trim().max(500).optional(),
});

export interface MarkOverride {
  marks: number;
  note?: string;
  adjustedAt: string;
}

export type MarkOverrides = Record<string, MarkOverride>;

export function parseMarkOverrides(raw: string | null | undefined): MarkOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as MarkOverrides) : {};
  } catch {
    // A corrupt blob must not take the whole report down with it — the AI's
    // marks are still intact in aiResponse and are what gets shown.
    return {};
  }
}

/** The mark actually in force for a question: the person's, else the AI's. */
export function effectiveMarks(grade: QuestionGrade, overrides: MarkOverrides): number {
  const o = overrides[String(grade.questionNumber)];
  return o ? o.marks : grade.marksAwarded;
}

export interface RecomputedTotals {
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
}

/**
 * Recomputes a sheet's totals from the effective marks. The denominator is
 * the same one the pipeline used — the sum of marksAvailable across the
 * questions actually graded, never a declared total (answerSheetGrading.ts),
 * so an override changes the numerator and nothing else.
 */
export function recomputeTotals(grades: QuestionGrade[], overrides: MarkOverrides): RecomputedTotals {
  const totalMarks = grades.reduce((sum, g) => sum + g.marksAvailable, 0);
  const obtainedMarks = grades.reduce((sum, g) => sum + effectiveMarks(g, overrides), 0);
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;
  return { obtainedMarks, totalMarks, percentage };
}

/**
 * Applies one change and returns the next overrides map. Rejects a mark
 * outside the question's own range — the same bound validateQuestionGrade()
 * enforces on the model, applied to people too, because a 7/5 typed by a
 * tired teacher at 11pm is exactly as wrong as a 7/5 from the model.
 */
export function applyOverride(
  current: MarkOverrides,
  grades: QuestionGrade[],
  change: z.infer<typeof markOverrideSchema>
): { ok: true; overrides: MarkOverrides } | { ok: false; error: string } {
  const grade = grades.find((g) => g.questionNumber === change.questionNumber);
  if (!grade) {
    return { ok: false, error: `This evaluation has no question ${change.questionNumber}.` };
  }

  const next: MarkOverrides = { ...current };
  const key = String(change.questionNumber);

  if (change.marks === null) {
    delete next[key];
    return { ok: true, overrides: next };
  }

  if (change.marks > grade.marksAvailable) {
    return {
      ok: false,
      error: `Question ${change.questionNumber} is out of ${grade.marksAvailable} marks, so ${change.marks} can't be awarded.`,
    };
  }

  next[key] = {
    marks: change.marks,
    ...(change.note ? { note: change.note } : {}),
    adjustedAt: new Date().toISOString(),
  };
  return { ok: true, overrides: next };
}
