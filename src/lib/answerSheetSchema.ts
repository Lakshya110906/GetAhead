import { z } from "zod";
import { SchemaType, type Schema } from "@google/generative-ai";

// Two-stage pipeline, two schemas — deliberately NOT one combined
// extract-and-grade call. Extraction is a vision task (read the actual
// document); grading is a reasoning task done per-question, in text, so a
// grounding quote can be checked in code against that question's own
// extracted answer before anything is trusted. Conflating the two stages
// was never possible to validate this way.

// ─── Stage 1: EXTRACT ───────────────────────────────────────────────────────
export const extractedQuestionSchema = z.object({
  questionNumber: z.number().int().positive(),
  questionText: z.string(),
  marksAvailable: z.number().positive(),
  // Full transcription of the student's answer INCLUDING working — marks
  // live in the working, not just the final answer, so truncating to "the
  // answer" loses exactly what grading needs.
  studentAnswer: z.string(),
  // Three distinct situations, not two: a genuinely blank answer scores
  // zero and still counts toward the total (the student attempted the
  // paper and chose not to answer this one) — it is not the same as an
  // answer that exists but can't be read, which is excluded from the total
  // entirely (extraction, not the student, failed). Collapsing these into
  // one boolean was a real, live scoring bug: every skipped question was
  // silently dropped from the denominator instead of scored against it,
  // inflating the percentage of every incomplete paper.
  answerStatus: z.enum(["readable", "blank", "unreadable"]),
});
export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;

export const extractionResultSchema = z.object({
  // The model's own read of what subject/grade this paper actually is —
  // compared in code against what the user selected in the form. Optional:
  // a model that can't tell either just leaves them blank rather than
  // guessing, which is safer than a false mismatch flag.
  detectedSubject: z.string().optional(),
  detectedGrade: z.string().optional(),
  questions: z.array(extractedQuestionSchema),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const GEMINI_EXTRACTION_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    detectedSubject: { type: SchemaType.STRING },
    detectedGrade: { type: SchemaType.STRING },
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          questionNumber: { type: SchemaType.NUMBER },
          questionText: { type: SchemaType.STRING },
          marksAvailable: { type: SchemaType.NUMBER },
          studentAnswer: { type: SchemaType.STRING },
          answerStatus: { type: SchemaType.STRING, format: "enum", enum: ["readable", "blank", "unreadable"] },
        },
        required: ["questionNumber", "questionText", "marksAvailable", "studentAnswer", "answerStatus"],
      },
    },
  },
  required: ["questions"],
};

// ─── Stage 2: GRADE (one question at a time) ────────────────────────────────
// errorType is now ONLY the four structural sentinels that code actually
// branches on (marks totals, denominator inclusion, full-marks validation).
// It used to also carry "method_error" vs "arithmetic_slip" — a maths-shaped
// binary applied to every subject, which produced things like an unbalanced
// chemical equation labelled "Arithmetic slip" (it isn't arithmetic) because
// the model had exactly two wrong-answer buckets to choose from regardless
// of subject. Same class of bug as the old hardcoded topic-keyword buckets:
// a fixed list that doesn't fit the content. Fixed the same way — collapsed
// to a single "incorrect" sentinel, and errorCategory (below) lets the model
// write whatever short, accurate category actually fits this subject and
// this error, generated in the same call as the feedback so it can't drift
// from a separately-computed classification.
export const ERROR_TYPES = ["correct", "incorrect", "unreadable", "blank"] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export const questionGradeSchema = z.object({
  questionNumber: z.number().int().positive(),
  marksAwarded: z.number().min(0),
  marksAvailable: z.number().positive(),
  // A short, honest topic/concept tag for this specific question — used to
  // build the topic breakdown by aggregation in code, never from a lookup
  // table. Left blank (not guessed) if the question doesn't cleanly map to
  // one concept; a paper where every question leaves this blank gets no
  // topic section at all, rather than a fabricated one.
  topic: z.string().optional(),
  correctPoints: z.array(z.string()),
  incorrectPoints: z.array(z.string()),
  errorType: z.enum(ERROR_TYPES),
  // Free text, model-authored, only meaningful when errorType is "incorrect"
  // (see the comment above ERROR_TYPES) — e.g. "Unbalanced equation",
  // "Energy-transfer misconception", "Arithmetic slip", whatever actually
  // describes this error for this subject. Not validated against a fixed
  // list; validated for consistency with incorrectPoints in code instead
  // (see the empty-incorrectPoints guard in answerSheetGrading.ts) — a
  // category with nothing behind it gets dropped rather than shown.
  errorCategory: z.string().optional(),
  // The specific line from the student's OWN answer the judgement rests on.
  // Checked in code against that question's extracted studentAnswer — not
  // just requested and trusted. Blank/unreadable questions are exempt (nothing
  // to quote).
  groundingQuote: z.string(),
  feedback: z.string(),
});
export type QuestionGrade = z.infer<typeof questionGradeSchema>;

export const GEMINI_GRADE_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    questionNumber: { type: SchemaType.NUMBER },
    marksAwarded: { type: SchemaType.NUMBER },
    marksAvailable: { type: SchemaType.NUMBER },
    topic: { type: SchemaType.STRING },
    correctPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    incorrectPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    errorType: { type: SchemaType.STRING, format: "enum", enum: [...ERROR_TYPES] },
    errorCategory: { type: SchemaType.STRING },
    groundingQuote: { type: SchemaType.STRING },
    feedback: { type: SchemaType.STRING },
  },
  required: ["questionNumber", "marksAwarded", "marksAvailable", "correctPoints", "incorrectPoints", "errorType", "groundingQuote", "feedback"],
};

// ─── Stage 2 (alternate): GRADE, batched — one call for the whole sheet ────
// Experimental path (Section 2b): same per-question fields, just requested
// for every question in a single call instead of one call each. Kept as a
// distinct schema/type rather than reusing questionGradeSchema's array
// directly so the two paths can evolve independently if batching needs
// different constraints later.
export const gradeBatchSchema = z.object({
  grades: z.array(questionGradeSchema),
});
export type GradeBatch = z.infer<typeof gradeBatchSchema>;

export const GEMINI_GRADE_BATCH_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    grades: {
      type: SchemaType.ARRAY,
      items: GEMINI_GRADE_RESPONSE_SCHEMA,
    },
  },
  required: ["grades"],
};

// ─── Final, persisted shape ──────────────────────────────────────────────────
export interface TopicBreakdown {
  topic: string;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
}

export interface GradedAnswerSheet {
  totalMarks: number; // sum of marksAvailable across graded questions — NEVER a fixed denominator
  obtainedMarks: number;
  percentage: number;
  grade: "A+" | "A" | "B+" | "B" | "C" | "F";
  questionGrades: QuestionGrade[];
  unreadableQuestions: number[]; // question numbers excluded from the total
  topicBreakdown: TopicBreakdown[] | null; // null when topics can't be honestly derived
  subjectMismatch: { declared: string; detected: string } | null;
  gradeMismatch: { declared: string; detected: string } | null;
  overallFeedback: string;
}
