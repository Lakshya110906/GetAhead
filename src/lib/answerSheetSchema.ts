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
  readable: z.boolean(),
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
          readable: { type: SchemaType.BOOLEAN },
        },
        required: ["questionNumber", "questionText", "marksAvailable", "studentAnswer", "readable"],
      },
    },
  },
  required: ["questions"],
};

// ─── Stage 2: GRADE (one question at a time) ────────────────────────────────
export const ERROR_TYPES = ["correct", "method_error", "arithmetic_slip", "unreadable", "blank"] as const;
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
    groundingQuote: { type: SchemaType.STRING },
    feedback: { type: SchemaType.STRING },
  },
  required: ["questionNumber", "marksAwarded", "marksAvailable", "correctPoints", "incorrectPoints", "errorType", "groundingQuote", "feedback"],
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
