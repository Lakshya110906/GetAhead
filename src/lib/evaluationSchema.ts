import { z } from "zod";
import { SchemaType, type Schema } from "@google/generative-ai";

// NOTE: this schema is not currently imported anywhere in src/ (confirmed
// via grep) — it belongs to the old single-blob transcribe-then-grade
// pipeline that answerSheetGrading.ts's two-stage, per-question pipeline
// replaced (same lineage as the now-deleted lib/gemini.ts). Kept as-is here
// rather than deleted unilaterally, since only gemini.ts's removal was
// actually requested — flagging for a deliberate decision, not doing it
// silently as a side effect of an unrelated task.
//
// Single source of truth for the shape of a grading result. Used twice:
// once to build Gemini's structured-output responseSchema (so the model is
// constrained to emit this shape), and again to actually validate what
// comes back — the model can still lie about numbers even inside a schema
// it's constrained to, so the shape being right is necessary but not
// sufficient.

export const questionMarkSchema = z.object({
  questionNumber: z.number(),
  question: z.string(),
  studentAnswer: z.string(),
  marksAwarded: z.number(),
  totalMarks: z.number(),
  isCorrect: z.boolean(),
  feedback: z.string(),
});

export const topicMarkSchema = z.object({
  topic: z.string(),
  obtainedMarks: z.number(),
  totalMarks: z.number(),
  percentage: z.number(),
  feedback: z.string(),
});

export const evaluationResultSchema = z.object({
  totalMarks: z.number(),
  obtainedMarks: z.number(),
  percentage: z.number(),
  grade: z.enum(["A+", "A", "B+", "B", "C", "F"]),
  subjectBreakdown: z.array(topicMarkSchema),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  overallFeedback: z.string(),
  // Non-empty on purpose: this is the granular, per-question data every
  // other number in the row must be recomputed from server-side. A model
  // response with no question-level breakdown at all is rejected outright.
  questionWise: z.array(questionMarkSchema).min(1),
});

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type QuestionMark = z.infer<typeof questionMarkSchema>;
export type TopicMark = z.infer<typeof topicMarkSchema>;

// Hand-mapped Gemini structured-output equivalent of the schema above.
// Gemini's schema format predates/differs from standard JSON Schema, so
// this can't be generated automatically from the Zod schema — keep the two
// in sync by eye when either changes.
export const GEMINI_EVALUATION_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    totalMarks: { type: SchemaType.NUMBER },
    obtainedMarks: { type: SchemaType.NUMBER },
    percentage: { type: SchemaType.NUMBER },
    grade: { type: SchemaType.STRING, format: "enum", enum: ["A+", "A", "B+", "B", "C", "F"] },
    subjectBreakdown: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          topic: { type: SchemaType.STRING },
          obtainedMarks: { type: SchemaType.NUMBER },
          totalMarks: { type: SchemaType.NUMBER },
          percentage: { type: SchemaType.NUMBER },
          feedback: { type: SchemaType.STRING },
        },
        required: ["topic", "obtainedMarks", "totalMarks", "percentage", "feedback"],
      },
    },
    strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    overallFeedback: { type: SchemaType.STRING },
    questionWise: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          questionNumber: { type: SchemaType.NUMBER },
          question: { type: SchemaType.STRING },
          studentAnswer: { type: SchemaType.STRING },
          marksAwarded: { type: SchemaType.NUMBER },
          totalMarks: { type: SchemaType.NUMBER },
          isCorrect: { type: SchemaType.BOOLEAN },
          feedback: { type: SchemaType.STRING },
        },
        required: ["questionNumber", "question", "studentAnswer", "marksAwarded", "totalMarks", "isCorrect", "feedback"],
      },
    },
  },
  required: [
    "totalMarks",
    "obtainedMarks",
    "percentage",
    "grade",
    "subjectBreakdown",
    "strengths",
    "weaknesses",
    "recommendations",
    "overallFeedback",
    "questionWise",
  ],
};
