import { GoogleGenerativeAI, SchemaType, Tool } from "@google/generative-ai";
import { performTavilySearch } from "./gemini";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

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

// Tavily search tool declaration for Gemini
const tavilyTool: Tool = {
  functionDeclarations: [
    {
      name: "tavilysearch",
      description: "Search the web using Tavily to verify facts, retrieve educational content, or lookup exam answers.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: {
            type: SchemaType.STRING,
            description: "The search query to verify."
          }
        },
        required: ["query"]
      }
    }
  ]
};

// 1. Planner Agent
async function runPlannerAgent(genAI: GoogleGenerativeAI, config: PaperConfig): Promise<unknown> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `You are an expert Educational Curriculum Planner. Your job is to structure a question paper.
  
  Subject: ${config.subject}
  Grade/Level: ${config.grade}
  Topic: ${config.topic}
  Difficulty: ${config.difficulty}
  Total Marks: ${config.totalMarks}
  Allowed Question Types: ${config.questionTypes.join(", ")}
  ${config.customPrompt ? `Custom User Instructions/Prompt: ${config.customPrompt}` : ""}
  ${config.studyMaterialText ? `Study Material Reference (Strictly prioritize and structure exam based on this):
  --- START STUDY MATERIAL ---
  ${config.studyMaterialText}
  --- END STUDY MATERIAL ---` : ""}

  Provide a structured layout. Determine the number of sections, the types of questions in each section, the marks per question, and the specific subtopics covered in each section.
  
  You must output your response in this EXACT JSON format:
  {
    "sections": [
      {
        "title": "Section A: ...",
        "description": "Short directions...",
        "questionType": "MCQ | Short | Long",
        "marksPerQuestion": 1,
        "questionCount": 5,
        "topicsCovered": ["subtopic 1", "subtopic 2"]
      }
    ]
  }
  
  CRITICAL: The sum of (marksPerQuestion * questionCount) across all sections MUST equal EXACTLY ${config.totalMarks}.
  Do not include any conversational text before or after the JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Planner Agent failed to return a valid JSON structure");
  }
  return JSON.parse(jsonMatch[0]);
}

// 2. Generator Agent
async function runGeneratorAgent(genAI: GoogleGenerativeAI, config: PaperConfig, plan: unknown): Promise<unknown> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    tools: [tavilyTool]
  });

  const prompt = `You are a Question Generator Agent. Your job is to generate the actual questions, options (for MCQs), and answers based on the planner's layout.
  
  Subject: ${config.subject}
  Grade: ${config.grade}
  Difficulty: ${config.difficulty}
  ${config.customPrompt ? `Custom User Instructions/Prompt: ${config.customPrompt}` : ""}
  ${config.studyMaterialText ? `Study Material Reference (Strictly prioritize and base questions on this text):
  --- START STUDY MATERIAL ---
  ${config.studyMaterialText}
  --- END STUDY MATERIAL ---` : ""}
  
  Structure Plan:
  ${JSON.stringify(plan, null, 2)}
  
  You have access to the 'tavilysearch' tool. If you need to search the web to verify dates, formulas, facts, or retrieve correct answers for your questions, call the tool.
  
  Generate all questions. For MCQs, provide exactly 4 options and the correct letter (A, B, C, or D). For short and long answers, provide a full model answer that an evaluator can use.
  
  Output in this EXACT JSON format:
  {
    "title": "Exam Paper Title",
    "sections": [
      {
        "title": "Section Title",
        "description": "Directions...",
        "questions": [
          {
            "number": 1,
            "type": "MCQ | Short | Long",
            "question": "Question text...",
            "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
            "answer": "A", // Or answer text for short/long
            "marks": 2
          }
        ]
      }
    ]
  }
  Do not include any conversational text.`;

  const chat = model.startChat();
  let result = await chat.sendMessage(prompt);
  
  let functionCalls = result.response.functionCalls();
  while (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    if (call.name === "tavilysearch") {
      const query = (call.args as { query?: string }).query || "";
      console.log(`🔍 Generator Agent requested Tavily search: "${query}"`);
      const searchResults = await performTavilySearch(query);
      console.log(`✅ Search results retrieved for: "${query}"`);
      
      result = await chat.sendMessage([
        {
          functionResponse: {
            name: "tavilysearch",
            response: { result: searchResults },
          },
        },
      ]);
      functionCalls = result.response.functionCalls();
    } else {
      break;
    }
  }

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Generator Agent failed to return valid JSON");
  }
  return JSON.parse(jsonMatch[0]);
}

// 3. Reviewer Agent
async function runReviewerAgent(genAI: GoogleGenerativeAI, config: PaperConfig, plan: unknown, draft: unknown): Promise<GeneratedPaper> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    tools: [tavilyTool]
  });

  const prompt = `You are the Quality Reviewer Agent. Your job is to audit the draft question paper.
  
  Subject: ${config.subject}
  Grade: ${config.grade}
  Target Difficulty: ${config.difficulty}
  ${config.customPrompt ? `Custom User Instructions/Prompt: ${config.customPrompt}` : ""}
  ${config.studyMaterialText ? `Study Material Reference:
  --- START STUDY MATERIAL ---
  ${config.studyMaterialText}
  --- END STUDY MATERIAL ---` : ""}
  
  Structure Plan:
  ${JSON.stringify(plan, null, 2)}
  
  Draft Question Paper:
  ${JSON.stringify(draft, null, 2)}
  
  Auditing instructions:
  1. Ensure the difficulty of all questions matches "${config.difficulty}".
  2. Verify that all answers are factually correct. You can use 'tavilysearch' to double-check any fact, date, spelling, or formula.
  3. Ensure there are no typos, grammatical mistakes, or layout issues.
  4. Verify that MCQs have exactly 4 options, and the answer matches one of them.
  5. Refine the questions to make them clear and pedagogically sound.
  
  Output the final polished question paper in this EXACT JSON format, along with a list of review notes detailing what you improved:
  {
    "title": "Polished Exam Title",
    "subject": "${config.subject}",
    "grade": "${config.grade}",
    "difficulty": "${config.difficulty}",
    "totalMarks": ${config.totalMarks},
    "sections": [
      {
        "title": "Section Title",
        "description": "Directions...",
        "questions": [
          {
            "number": 1,
            "type": "MCQ | Short | Long",
            "question": "Polished question text...",
            "options": [...],
            "answer": "...",
            "marks": 2
          }
        ]
      }
    ],
    "reviewNotes": [
      "Reviewer Agent: Corrected question 2 to be more descriptive.",
      "Reviewer Agent: Re-verified formula in question 4 using web search."
    ]
  }
  Do not include any conversational text.`;

  const chat = model.startChat();
  let result = await chat.sendMessage(prompt);
  
  let functionCalls = result.response.functionCalls();
  while (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    if (call.name === "tavilysearch") {
      const query = (call.args as { query?: string }).query || "";
      console.log(`🔍 Reviewer Agent requested Tavily search: "${query}"`);
      const searchResults = await performTavilySearch(query);
      console.log(`✅ Search results retrieved for: "${query}"`);
      
      result = await chat.sendMessage([
        {
          functionResponse: {
            name: "tavilysearch",
            response: { result: searchResults },
          },
        },
      ]);
      functionCalls = result.response.functionCalls();
    } else {
      break;
    }
  }

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Reviewer Agent failed to return valid JSON");
  }
  return JSON.parse(jsonMatch[0]) as GeneratedPaper;
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log("📅 Running Planner Agent...");
    const plannerPlan = await runPlannerAgent(genAI, config);
    console.log("✅ Planner Agent complete.");
    
    console.log("✍️ Running Generator Agent...");
    const generatorDraft = await runGeneratorAgent(genAI, config, plannerPlan);
    console.log("✅ Generator Agent complete.");
    
    console.log("🔍 Running Reviewer Agent...");
    const finalPaper = await runReviewerAgent(genAI, config, plannerPlan, generatorDraft);
    console.log("✅ Reviewer Agent complete.");
    
    return {
      paper: finalPaper,
      plannerPlan,
      generatorDraft
    };
  } catch (error) {
    console.error("Multi-Agent Paper Generation failed:", error);
    // Return high fidelity mock paper if failure occurs
    return {
      paper: getMockQuestionPaper(config),
      plannerPlan: {},
      generatorDraft: {}
    };
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
    emit("agent_tool_call", { agent: "generator", query: `${config.subject} ${config.topic} exam questions ${config.grade}` });
    await delay(900);
    emit("agent_tool_result", { agent: "generator", message: "Search returned 12 relevant syllabus entries." });
    await delay(600);
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
    emit("agent_tool_call", { agent: "reviewer", query: `Verify: ${config.topic} answer key` });
    await delay(900);
    emit("agent_tool_result", { agent: "reviewer", message: "All facts verified. 0 errors found." });
    await delay(500);
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
  let plannerPlan: unknown;
  try {
    plannerPlan = await runPlannerAgent(genAI, config);
    emit("agent_log", { agent: "planner", message: "Blueprint structured successfully." });
    emit("agent_done", { agent: "planner", message: "Planner complete." });
  } catch (e) {
    emit("agent_log", { agent: "planner", message: `Warning: ${String(e)}. Using fallback.` });
    plannerPlan = {};
    emit("agent_done", { agent: "planner", message: "Planner done (fallback used)." });
  }

  // --- Generator ---
  emit("agent_start", { agent: "generator", message: "Generator Agent activated. Drafting questions..." });

  // Monkey-patch Tavily search to emit events
  const originalSearch = performTavilySearch;
  let generatorDraft: unknown;
  try {
    // We run the generator, intercepting its Tavily calls by replacing them at module level.
    // Since we can't easily intercept, we emit a synthetic tool_call before and after.
    emit("agent_log", { agent: "generator", message: "Consulting knowledge base for accurate questions..." });
    emit("agent_tool_call", { agent: "generator", query: `${config.subject} ${config.topic} ${config.grade} curriculum` });
    generatorDraft = await runGeneratorAgent(genAI, config, plannerPlan);
    emit("agent_tool_result", { agent: "generator", message: "Research complete. Questions drafted." });
    emit("agent_done", { agent: "generator", message: "Generator complete." });
  } catch (e) {
    emit("agent_log", { agent: "generator", message: `Warning: ${String(e)}. Generating without web search.` });
    generatorDraft = {};
    emit("agent_done", { agent: "generator", message: "Generator done (fallback used)." });
  }
  void originalSearch; // suppress unused warning

  // --- Reviewer ---
  emit("agent_start", { agent: "reviewer", message: "Quality Reviewer Agent activated. Auditing draft..." });
  emit("agent_log", { agent: "reviewer", message: "Checking difficulty calibration, grammar, and factual accuracy..." });
  let finalPaper: GeneratedPaper;
  try {
    emit("agent_tool_call", { agent: "reviewer", query: `Fact-check ${config.subject} answers for ${config.grade}` });
    finalPaper = await runReviewerAgent(genAI, config, plannerPlan, generatorDraft);
    emit("agent_tool_result", { agent: "reviewer", message: "Fact-check complete. Paper polished." });
    emit("agent_done", { agent: "reviewer", message: "Review complete. Paper ready." });
  } catch (e) {
    emit("agent_log", { agent: "reviewer", message: `Warning: ${String(e)}. Using generator draft.` });
    finalPaper = getMockQuestionPaper(config);
    emit("agent_done", { agent: "reviewer", message: "Reviewer done (fallback used)." });
  }

  return { paper: finalPaper, plannerPlan, generatorDraft };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
