import { z } from "zod";
import { SchemaType, type Schema } from "@google/generative-ai";

// Same principle as evaluationSchema.ts: a schema is the single source of
// truth for what we ask Gemini to return (constrains the shape) and what we
// accept back (validates it). Structured output guarantees the SHAPE is
// right — it cannot guarantee the model's arithmetic is right (marks per
// question summing to the requested total), so callers must still recompute
// and validate numbers in code. See correctPlanMarks() / recomputePaperMarks()
// in question-agents.ts.

export const plannerSectionSchema = z.object({
  title: z.string(),
  description: z.string(),
  questionType: z.enum(["MCQ", "Short", "Long"]),
  marksPerQuestion: z.number().positive(),
  questionCount: z.number().int().positive(),
  topicsCovered: z.array(z.string()),
});

export const plannerPlanSchema = z.object({
  sections: z.array(plannerSectionSchema).min(1),
});

export type PlannerPlan = z.infer<typeof plannerPlanSchema>;

export const GEMINI_PLANNER_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          questionType: { type: SchemaType.STRING, format: "enum", enum: ["MCQ", "Short", "Long"] },
          marksPerQuestion: { type: SchemaType.NUMBER },
          questionCount: { type: SchemaType.NUMBER },
          topicsCovered: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["title", "description", "questionType", "marksPerQuestion", "questionCount", "topicsCovered"],
      },
    },
  },
  required: ["sections"],
};

export const markSchemePointSchema = z.object({
  point: z.string().min(1),
  marks: z.number().positive(),
});

export const questionSchema = z.object({
  number: z.number().int().positive(),
  type: z.enum(["MCQ", "Short", "Long"]),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1),
  // Structured per-mark breakdown — the actual source of truth for grading.
  // `answer` above is kept as a full model-answer string for the existing
  // UI (copy-to-clipboard export, answer-key view, inline edit) but the
  // per-mark allocation must come from here, and its marks must sum to
  // question.marks (enforced in paperValidation.ts, not by Zod, since it's
  // a cross-field check).
  markScheme: z.array(markSchemePointSchema).min(1),
  marks: z.number().positive(),
  // The model's own short statement of which requested topic/subtopic this
  // question actually tests — validated against, instead of scanning the
  // question's prose for a literal keyword substring. Fixes a real bug: a
  // user typo in the topic ("trignometry") never appears in a correctly-
  // spelled generated question ("trigonometry"), and plenty of genuinely
  // on-topic questions never use the topic word at all (a circle-tangent
  // question is geometry without ever saying "geometry"). This field is
  // short, model-authored, and purpose-built for exactly this check —
  // deliberately not reusing the free-form question text.
  topicAddressed: z.string().min(1),
});

export const paperSectionSchema = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(questionSchema).min(1),
});

export const generatedPaperSchema = z.object({
  title: z.string(),
  subject: z.string(),
  grade: z.string(),
  difficulty: z.string(),
  totalMarks: z.number(),
  sections: z.array(paperSectionSchema).min(1),
  reviewNotes: z.array(z.string()).optional(),
});

export type GeneratedPaperShape = z.infer<typeof generatedPaperSchema>;

const GEMINI_MARK_SCHEME_POINT_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    point: { type: SchemaType.STRING },
    marks: { type: SchemaType.NUMBER },
  },
  required: ["point", "marks"],
};

const GEMINI_QUESTION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    number: { type: SchemaType.NUMBER },
    type: { type: SchemaType.STRING, format: "enum", enum: ["MCQ", "Short", "Long"] },
    question: { type: SchemaType.STRING },
    options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    answer: { type: SchemaType.STRING },
    markScheme: { type: SchemaType.ARRAY, items: GEMINI_MARK_SCHEME_POINT_SCHEMA },
    marks: { type: SchemaType.NUMBER },
    topicAddressed: { type: SchemaType.STRING },
  },
  required: ["number", "type", "question", "answer", "markScheme", "marks", "topicAddressed"],
};

export const GEMINI_PAPER_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    subject: { type: SchemaType.STRING },
    grade: { type: SchemaType.STRING },
    difficulty: { type: SchemaType.STRING },
    totalMarks: { type: SchemaType.NUMBER },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          questions: { type: SchemaType.ARRAY, items: GEMINI_QUESTION_SCHEMA },
        },
        required: ["title", "description", "questions"],
      },
    },
    reviewNotes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["title", "subject", "grade", "difficulty", "totalMarks", "sections"],
};
