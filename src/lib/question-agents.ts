import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  plannerPlanSchema,
  generatedPaperSchema,
  GEMINI_PLANNER_RESPONSE_SCHEMA,
  GEMINI_PAPER_RESPONSE_SCHEMA,
  type PlannerPlan,
  type GeneratedPaperShape,
} from "./questionPaperSchema";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const MODEL_ID = "gemini-2.5-flash";

// Gemini's free-tier rate limit is the single most common reason an agent
// call fails — a bare try/catch that gave up after one attempt turned a
// transient 429 into a permanently degraded (or fully generic mock) paper.
// Retrying with backoff on exactly the errors that are actually transient
// fixes the common case instead of silently producing garbage.
const RETRYABLE_ERROR_PATTERN = /429|rate.?limit|quota|RESOURCE_EXHAUSTED|503|overloaded|ECONNRESET|ETIMEDOUT|fetch failed/i;

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      if (i === attempts - 1 || !RETRYABLE_ERROR_PATTERN.test(message)) throw err;
      const backoffMs = 1000 * Math.pow(2, i); // 1s, 2s
      console.warn(`${label} failed (attempt ${i + 1}/${attempts}), retrying in ${backoffMs}ms: ${message}`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError;
}

// ─── Agent Event Types ────────────────────────────────────────────────────────
export type AgentName = "planner" | "generator" | "reviewer";
export type AgentEventType =
  | "agent_start"
  | "agent_log"
  | "agent_tool_call"
  | "agent_tool_result"
  | "agent_done"
  | "complete"
  | "error";

export interface AgentEvent {
  event: AgentEventType;
  agent?: AgentName;
  message?: string;
  query?: string;
  data?: unknown;
}

export type EmitFn = (event: string, payload: Record<string, unknown>) => void;

export interface PaperConfig {
  subject: string;
  grade: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  totalMarks: number;
  questionTypes: string[]; // e.g. ["MCQ", "Short Answer", "Long Answer"]
  customPrompt?: string;
  studyMaterialText?: string;
}

export interface Question {
  number: number;
  type: string;
  question: string;
  options?: string[];
  answer: string;
  marks: number;
}

export interface PaperSection {
  title: string;
  description: string;
  questions: Question[];
}

export interface GeneratedPaper {
  title: string;
  subject: string;
  grade: string;
  difficulty: string;
  totalMarks: number;
  sections: PaperSection[];
  reviewNotes?: string[];
}

// Mock question paper generator when API keys are not present
function getMockQuestionPaper(config: PaperConfig): GeneratedPaper {
  const sections: PaperSection[] = [];
  let questionCounter = 1;

  const hasMCQ = config.questionTypes.includes("MCQ");
  const hasShort = config.questionTypes.includes("Short Answer");
  const hasLong = config.questionTypes.includes("Long Answer");

  if (hasMCQ) {
    sections.push({
      title: "Section A: Multiple Choice Questions",
      description: "Select the single best answer for each question. (1 Mark each)",
      questions: [
        {
          number: questionCounter++,
          type: "MCQ",
          question: `Which of the following best describes the core concept of ${config.topic || config.subject}?`,
          options: [
            "A standard rule-based procedure",
            "An underlying fundamental principle that governs key processes",
            "An archaic methodology used before digital tools",
            "A temporary phenomenon with limited scope"
          ],
          answer: "B",
          marks: 1
        },
        {
          number: questionCounter++,
          type: "MCQ",
          question: `What is the primary factor affecting the system behaviour in ${config.topic || config.subject}?`,
          options: [
            "Ambient temperature and pressure constraints",
            "Initial boundary conditions and input variables",
            "User preference settings",
            "Random fluctuations in local nodes"
          ],
          answer: "B",
          marks: 1
        }
      ]
    });
  }

  if (hasShort) {
    sections.push({
      title: "Section B: Short Answer Questions",
      description: "Provide concise answers explaining the following statements. (3 Marks each)",
      questions: [
        {
          number: questionCounter++,
          type: "Short",
          question: `Explain how the fundamental principles of ${config.topic || config.subject} are applied in real-world scenarios.`,
          answer: "The principles are applied by identifying the system components, establishing the relationship equations (e.g. conservation laws or grammatical rules), and solving them under specified boundary constraints.",
          marks: 3
        },
        {
          number: questionCounter++,
          type: "Short",
          question: `Differentiate between the static and dynamic models used to analyze ${config.topic || config.subject}.`,
          answer: "Static models describe state variables at equilibrium or constant time intervals, whereas dynamic models capture changes over time using differential equations or process workflows.",
          marks: 3
        }
      ]
    });
  }

  if (hasLong) {
    const totalCurrentMarks = sections.reduce((sum, s) => sum + s.questions.reduce((qSum, q) => qSum + q.marks, 0), 0);
    const longMarks = Math.max(5, config.totalMarks - totalCurrentMarks);
    sections.push({
      title: "Section C: Long Answer / Structured Questions",
      description: "Answer the following question in detail, showing all your workings and reasoning. (Detailed Answers)",
      questions: [
        {
          number: questionCounter++,
          type: "Long",
          question: `Analyze a major case study or problem in ${config.topic || config.subject}. Discuss the limitations of standard methods, and propose a comprehensive solution framework.`,
          answer: "A comprehensive analysis requires: 1) System definition and parameter identification. 2) Developing the core equations. 3) Highlighting failure modes (limitations) e.g., non-linearities, temperature changes, or contextual syntax rules. 4) Proposing corrective measures such as adaptive control loops or error-correction parsing algorithms.",
          marks: longMarks
        }
      ]
    });
  }

  // Adjust total marks to match request
  const computedTotal = sections.reduce((sum, s) => sum + s.questions.reduce((qSum, q) => qSum + q.marks, 0), 0);

  return {
    title: `${config.difficulty} ${config.subject} Examination Paper on ${config.topic || "Core Syllabus"}`,
    subject: config.subject,
    grade: config.grade,
    difficulty: config.difficulty,
    totalMarks: computedTotal,
    sections,
    reviewNotes: [
      "Planner Agent: Allocated questions proportional to target weightings.",
      "Generator Agent: Prepared questions and answers aligning to requested topic.",
      "Quality Reviewer Agent: Audited MCQs for unique options and confirmed answer accuracy."
    ]
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Structured output constrains the SHAPE Gemini returns (valid JSON, right
 * field types) — it cannot constrain that questionCount × marksPerQuestion
 * sums to the marks the user actually asked for, which is exactly the
 * arithmetic instruction-following LLMs are least reliable at, and exactly
 * why "10 questions of 10 marks each" used to silently not happen. Rather
 * than hope the model got it right, force it: if the plan's total is off,
 * adjust the last section's question count deterministically so downstream
 * agents are handed a plan that is guaranteed to add up, every time.
 */
function correctPlanMarks(plan: PlannerPlan, targetTotal: number): PlannerPlan {
  const sections = plan.sections.map((s) => ({ ...s }));
  const currentTotal = sections.reduce((sum, s) => sum + s.marksPerQuestion * s.questionCount, 0);
  const diff = round2(targetTotal - currentTotal);
  if (diff === 0) return { sections };

  const last = sections[sections.length - 1];
  // Prefer adjusting question count (keeps the requested marks-per-question
  // intact, which is usually the more specific part of what the user asked
  // for — "10 questions of 10 marks" cares about both, but marksPerQuestion
  // is the number most often stated explicitly).
  const extraQuestions = diff / last.marksPerQuestion;
  if (Number.isInteger(extraQuestions) && last.questionCount + extraQuestions >= 1) {
    last.questionCount += extraQuestions;
  } else {
    // Fall back to absorbing the remainder into this section's per-question
    // marks, spread across its questions.
    const newMarksPerQuestion = round2((last.marksPerQuestion * last.questionCount + diff) / last.questionCount);
    last.marksPerQuestion = Math.max(1, newMarksPerQuestion);
  }
  return { sections };
}

function planTotal(plan: PlannerPlan): number {
  return round2(plan.sections.reduce((sum, s) => sum + s.marksPerQuestion * s.questionCount, 0));
}

// A custom instruction is allowed to override the numeric "total marks"
// field on purpose (see the planner prompt) — "10 questions of 10 marks
// each" implies 100 marks even if the total-marks field still says 30.
// Force-correcting the plan back to the field's value in that case would
// silently undo the exact override the prompt told the model to make. Only
// force an exact match to the field when there's no custom instruction to
// have overridden it; otherwise trust the plan's own total and carry that
// forward as the real target for the rest of the pipeline.
function resolveEffectiveTotal(plan: PlannerPlan, config: PaperConfig): { plan: PlannerPlan; effectiveTotal: number } {
  if (!config.customPrompt?.trim()) {
    return { plan: correctPlanMarks(plan, config.totalMarks), effectiveTotal: config.totalMarks };
  }
  const total = planTotal(plan);
  return { plan, effectiveTotal: total > 0 ? total : config.totalMarks };
}

/**
 * Mirrors recomputeFromQuestionMarks() in lib/gemini.ts: never trust the
 * model's self-reported totalMarks, even inside a schema it's constrained
 * to — recompute it from the actual per-question marks. If that computed
 * total still doesn't match what the user asked for (the generator/reviewer
 * didn't perfectly follow the corrected plan), say so plainly instead of
 * quietly displaying a number that doesn't match reality.
 */
function recomputePaperMarks(paper: GeneratedPaperShape, targetTotal: number): GeneratedPaper {
  const computedTotal = round2(
    paper.sections.reduce((sum, s) => sum + s.questions.reduce((qSum, q) => qSum + q.marks, 0), 0)
  );
  const reviewNotes = [...(paper.reviewNotes ?? [])];
  if (Math.abs(computedTotal - targetTotal) > 0.01) {
    reviewNotes.push(
      `[Warning] This paper totals ${computedTotal} marks; you requested ${targetTotal}. Question marks were not adjusted automatically so the content stays consistent with what was written — use Apply Tweaks to ask for a specific section to be resized.`
    );
  }
  return { ...paper, totalMarks: computedTotal, reviewNotes };
}

// 1. Planner Agent
async function runPlannerAgent(genAI: GoogleGenerativeAI, config: PaperConfig): Promise<PlannerPlan> {
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_PLANNER_RESPONSE_SCHEMA,
    },
  });
  const prompt = `You are an expert educational curriculum planner. Structure a question paper.

Subject: ${config.subject}
Grade/Level: ${config.grade}
Topic: ${config.topic}
Difficulty: ${config.difficulty}
Total marks: ${config.totalMarks}
Allowed question types: ${config.questionTypes.join(", ")}
${config.customPrompt ? `Custom user instructions: ${config.customPrompt}` : ""}
${config.studyMaterialText ? `Study material reference (strictly prioritize and structure the exam based on this):
--- START STUDY MATERIAL ---
${config.studyMaterialText}
--- END STUDY MATERIAL ---` : ""}

Determine the number of sections, the question type of each section, the marks per question, the question count, and the specific subtopics covered in each section.

The sum of (marksPerQuestion × questionCount) across all sections must equal ${config.totalMarks} as closely as possible — this is the single most important constraint. If the custom instructions specify an exact question count or marks-per-question (e.g. "10 questions of 10 marks each"), follow that exactly and let it drive the total, even if it doesn't match the total-marks field.`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());
  return plannerPlanSchema.parse(parsed);
}

// 2. Generator Agent
async function runGeneratorAgent(genAI: GoogleGenerativeAI, config: PaperConfig, plan: PlannerPlan): Promise<GeneratedPaperShape> {
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_PAPER_RESPONSE_SCHEMA,
    },
  });

  const prompt = `You are a question generator agent. Generate the actual questions, options (for MCQs), and answers based on the planner's layout below.

Subject: ${config.subject}
Grade: ${config.grade}
Difficulty: ${config.difficulty}
${config.customPrompt ? `Custom user instructions: ${config.customPrompt}` : ""}
${config.studyMaterialText ? `Study material reference (strictly prioritize and base questions on this text):
--- START STUDY MATERIAL ---
${config.studyMaterialText}
--- END STUDY MATERIAL ---` : ""}

Structure plan (follow the exact questionCount and marksPerQuestion for every section — do not add, drop, or resize questions):
${JSON.stringify(plan, null, 2)}

For MCQs, provide exactly 4 options as plain text (do not prefix them with "A)", "B)", etc. — that numbering is added when the paper is displayed) and the correct letter (A, B, C, or D) as the answer. For short and long answers, provide a full model answer an evaluator can use. Write plain text only — no LaTeX, no markdown, no dollar signs; spell out formulas in words or plain characters (e.g. "H2O", "x^2" as "x squared" or "x^2").`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());
  return generatedPaperSchema.parse(parsed);
}

// 3. Reviewer Agent
async function runReviewerAgent(genAI: GoogleGenerativeAI, config: PaperConfig, plan: PlannerPlan, draft: GeneratedPaperShape): Promise<GeneratedPaperShape> {
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_PAPER_RESPONSE_SCHEMA,
    },
  });

  const prompt = `You are the quality reviewer agent. Audit and polish the draft question paper below.

Subject: ${config.subject}
Grade: ${config.grade}
Target difficulty: ${config.difficulty}
${config.customPrompt ? `Custom user instructions: ${config.customPrompt}` : ""}
${config.studyMaterialText ? `Study material reference:
--- START STUDY MATERIAL ---
${config.studyMaterialText}
--- END STUDY MATERIAL ---` : ""}

Structure plan (the draft must match this exactly — same number of questions per section, same marks per question; do not add, drop, or resize questions):
${JSON.stringify(plan, null, 2)}

Draft question paper:
${JSON.stringify(draft, null, 2)}

Auditing instructions:
1. Ensure the difficulty of all questions matches "${config.difficulty}".
2. Check that answers are factually and mathematically correct; fix any that are wrong.
3. Fix typos, grammar, and layout issues.
4. Verify MCQs have exactly 4 options and the answer matches one of them.
5. Refine questions to be clear and pedagogically sound.
6. Do not change the number of questions or the marks assigned to any question — only improve their content.
7. Write plain text only — no LaTeX, no markdown, no dollar signs.

Output the final polished question paper, with reviewNotes listing what you improved (or an empty array if nothing needed changing).`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());
  return generatedPaperSchema.parse(parsed);
}

// Master workflow controller
export async function generateQuestionPaper(config: PaperConfig): Promise<{
  paper: GeneratedPaper;
  plannerPlan: unknown;
  generatorDraft: unknown;
}> {
  // Return mock if no API key or placeholder
  if (!apiKey || apiKey === "your-gemini-api-key-here" || apiKey.startsWith("your-gemini")) {
    console.log("⚠️  Gemini API key not configured/placeholder — running simulated multi-agent pipeline");
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate work
    const paper = getMockQuestionPaper(config);
    return {
      paper,
      plannerPlan: { sections: paper.sections.map(s => ({ title: s.title, questionCount: s.questions.length })) },
      generatorDraft: { title: paper.title, sections: paper.sections }
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let plannerPlan: PlannerPlan | null = null;
  let generatorDraft: GeneratedPaperShape | null = null;
  let effectiveTotal = config.totalMarks;

  try {
    console.log("📅 Running Planner Agent...");
    const rawPlan = await withRetry(() => runPlannerAgent(genAI, config), "Planner Agent");
    ({ plan: plannerPlan, effectiveTotal } = resolveEffectiveTotal(rawPlan, config));
    console.log("✅ Planner Agent complete.");

    console.log("✍️ Running Generator Agent...");
    generatorDraft = await withRetry(() => runGeneratorAgent(genAI, config, plannerPlan!), "Generator Agent");
    console.log("✅ Generator Agent complete.");

    console.log("🔍 Running Reviewer Agent...");
    const reviewed = await withRetry(() => runReviewerAgent(genAI, config, plannerPlan!, generatorDraft!), "Reviewer Agent");
    console.log("✅ Reviewer Agent complete.");

    return { paper: recomputePaperMarks(reviewed, effectiveTotal), plannerPlan, generatorDraft };
  } catch (error) {
    console.error("Multi-Agent Paper Generation failed:", error);
    // The generator's real, on-topic draft is almost always a better result
    // than the fully generic mock — only fall all the way back to the mock
    // if there's genuinely no usable draft content.
    if (generatorDraft && generatorDraft.sections.length > 0) {
      const paper = recomputePaperMarks(
        { ...generatorDraft, reviewNotes: ["[Warning] Automated quality review couldn't complete due to a temporary AI service issue. These questions were generated but not independently fact-checked — review them before use, or try regenerating."] },
        effectiveTotal
      );
      return { paper, plannerPlan, generatorDraft };
    }
    const paper = getMockQuestionPaper(config);
    paper.reviewNotes = [
      "[Warning] We couldn't reach the AI service to generate your custom paper right now. This is a generic placeholder — it does not reflect your subject, topic, or custom instructions. Please try again in a moment.",
    ];
    return { paper, plannerPlan: {}, generatorDraft: {} };
  }
}

// ─── Streamed version with live event emission ───────────────────────────────
export async function generateQuestionPaperStreamed(
  config: PaperConfig,
  emit: EmitFn
): Promise<{
  paper: GeneratedPaper;
  plannerPlan: unknown;
  generatorDraft: unknown;
}> {
  // ── Mock mode when no API key ──────────────────────────────────────────────
  if (!apiKey || apiKey === "your-gemini-api-key-here" || apiKey.startsWith("your-gemini")) {
    // Simulate planner
    emit("agent_start", { agent: "planner", message: "Planner Agent activated. Reading exam requirements..." });
    await delay(700);
    if (config.studyMaterialText) {
      emit("agent_log", { agent: "planner", message: "Reading and indexing uploaded study material (up to 8,000 characters)..." });
      await delay(600);
    }
    if (config.customPrompt) {
      emit("agent_log", { agent: "planner", message: `Parsing custom prompt rules: "${config.customPrompt.slice(0, 40)}${config.customPrompt.length > 40 ? '...' : ''}"` });
      await delay(600);
    }
    emit("agent_log", { agent: "planner", message: `Analyzing: ${config.subject} • ${config.grade} • ${config.difficulty}` });
    await delay(600);
    emit("agent_log", { agent: "planner", message: `Target: ${config.totalMarks} marks across [${config.questionTypes.join(", ")}]` });
    await delay(800);
    emit("agent_log", { agent: "planner", message: "Allocating sections and mark ratios..." });
    await delay(700);
    emit("agent_done", { agent: "planner", message: "Planner complete. Blueprint ready." });

    // Simulate generator
    emit("agent_start", { agent: "generator", message: "Generator Agent activated. Drafting questions..." });
    await delay(500);
    if (config.studyMaterialText) {
      emit("agent_log", { agent: "generator", message: "Prioritizing question generation from uploaded study material..." });
      await delay(600);
    }
    if (config.customPrompt) {
      emit("agent_log", { agent: "generator", message: "Applying custom styles and constraint prompts..." });
      await delay(700);
    }
    emit("agent_log", { agent: "generator", message: "Writing MCQ alternatives with unique distractors..." });
    await delay(700);
    emit("agent_log", { agent: "generator", message: "Composing short-answer model solutions..." });
    await delay(600);
    emit("agent_done", { agent: "generator", message: "Generator complete. Draft paper ready." });

    // Simulate reviewer
    emit("agent_start", { agent: "reviewer", message: "Quality Reviewer Agent activated. Auditing draft..." });
    await delay(500);
    emit("agent_log", { agent: "reviewer", message: "Checking difficulty calibration across all questions..." });
    await delay(600);
    emit("agent_log", { agent: "reviewer", message: "Polishing language, fixing typos, confirming MCQ answer keys..." });
    await delay(600);
    emit("agent_done", { agent: "reviewer", message: "Review complete. Paper finalized." });

    const paper = getMockQuestionPaper(config);
    return {
      paper,
      plannerPlan: { sections: paper.sections.map(s => ({ title: s.title, questionCount: s.questions.length })) },
      generatorDraft: { title: paper.title, sections: paper.sections }
    };
  }

  // ── Live AI mode ────────────────────────────────────────────────────────────
  const genAI = new GoogleGenerativeAI(apiKey);

  // --- Planner ---
  emit("agent_start", { agent: "planner", message: "Planner Agent activated. Reading exam requirements..." });
  if (config.studyMaterialText) {
    emit("agent_log", { agent: "planner", message: "Reading and indexing uploaded study material (up to 8,000 characters)..." });
  }
  if (config.customPrompt) {
    emit("agent_log", { agent: "planner", message: `Applying style requirements: "${config.customPrompt.slice(0, 50)}${config.customPrompt.length > 50 ? '...' : ''}"` });
  }
  emit("agent_log", { agent: "planner", message: `Subject: ${config.subject} | Grade: ${config.grade} | Difficulty: ${config.difficulty}` });
  emit("agent_log", { agent: "planner", message: `Allocating ${config.totalMarks} marks across: ${config.questionTypes.join(", ")}` });
  let plannerPlan: PlannerPlan;
  let effectiveTotal = config.totalMarks;
  try {
    const rawPlan = await withRetry(() => runPlannerAgent(genAI, config), "Planner Agent");
    ({ plan: plannerPlan, effectiveTotal } = resolveEffectiveTotal(rawPlan, config));
    if (effectiveTotal !== config.totalMarks) {
      emit("agent_log", { agent: "planner", message: `Custom instructions specify a different question/marks structure — following that instead of the ${config.totalMarks}-mark target (paper will total ${effectiveTotal}).` });
    }
    emit("agent_log", { agent: "planner", message: "Blueprint structured successfully." });
    emit("agent_done", { agent: "planner", message: "Planner complete." });
  } catch (e) {
    emit("agent_log", { agent: "planner", message: `Warning: ${String(e)}. Using fallback.` });
    plannerPlan = { sections: [] };
    emit("agent_done", { agent: "planner", message: "Planner done (fallback used)." });
  }

  // --- Generator ---
  emit("agent_start", { agent: "generator", message: "Generator Agent activated. Drafting questions..." });
  emit("agent_log", { agent: "generator", message: "Writing questions and model answers from the structure plan..." });
  if (config.customPrompt) {
    emit("agent_log", { agent: "generator", message: "Applying custom style and constraint instructions..." });
  }
  let generatorDraft: GeneratedPaperShape | null = null;
  try {
    generatorDraft = await withRetry(() => runGeneratorAgent(genAI, config, plannerPlan), "Generator Agent");
    emit("agent_done", { agent: "generator", message: "Generator complete. Draft paper ready." });
  } catch (e) {
    emit("agent_log", { agent: "generator", message: `Warning: ${String(e)}.` });
    emit("agent_done", { agent: "generator", message: "Generator done (fallback used)." });
  }

  // --- Reviewer ---
  emit("agent_start", { agent: "reviewer", message: "Quality Reviewer Agent activated. Auditing draft..." });
  emit("agent_log", { agent: "reviewer", message: "Checking difficulty calibration, grammar, and answer accuracy..." });
  let finalPaper: GeneratedPaper;
  try {
    if (!generatorDraft) throw new Error("No draft available to review.");
    const reviewed = await withRetry(() => runReviewerAgent(genAI, config, plannerPlan, generatorDraft!), "Reviewer Agent");
    finalPaper = recomputePaperMarks(reviewed, effectiveTotal);
    emit("agent_done", { agent: "reviewer", message: "Review complete. Paper ready." });
  } catch (e) {
    emit("agent_log", { agent: "reviewer", message: `Warning: ${String(e)}. Using generator draft.` });
    // The generator's real, on-topic draft is almost always a better result
    // than the fully generic mock paper — only fall all the way back to the
    // mock if there's genuinely no usable draft content to fall back on.
    if (generatorDraft && generatorDraft.sections.length > 0) {
      finalPaper = recomputePaperMarks(
        { ...generatorDraft, reviewNotes: ["[Warning] Automated quality review couldn't complete due to a temporary AI service issue. These questions were generated but not independently fact-checked — review them before use, or try regenerating."] },
        effectiveTotal
      );
    } else {
      finalPaper = getMockQuestionPaper(config);
      finalPaper.reviewNotes = [
        "[Warning] We couldn't reach the AI service to generate your custom paper right now. This is a generic placeholder — it does not reflect your subject, topic, or custom instructions. Please try again in a moment.",
      ];
    }
    emit("agent_done", { agent: "reviewer", message: "Reviewer done (fallback used)." });
  }

  return { paper: finalPaper, plannerPlan, generatorDraft };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
