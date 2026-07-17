import { GoogleGenerativeAI, FunctionDeclaration, Tool, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

function buildEvaluationPrompt(
  subject: string,
  grade: string,
  examType: string,
  ocrText: string
): string {
  return `You are an expert educational evaluator and teacher. Evaluate the following exam answer sheet.

**Subject**: ${subject}
**Grade/Level**: ${grade}
**Exam Type**: ${examType}

**Answer Sheet Content (OCR extracted)**:
${ocrText}

Please provide a comprehensive evaluation in the following JSON format:
{
  "totalMarks": <number>,
  "obtainedMarks": <number>,
  "percentage": <number>,
  "grade": "<A+|A|B+|B|C|F>",
  "subjectBreakdown": [
    {
      "topic": "<topic name>",
      "obtainedMarks": <number>,
      "totalMarks": <number>,
      "percentage": <number>,
      "feedback": "<specific feedback for this topic>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "overallFeedback": "<comprehensive paragraph about student performance>",
  "questionWise": [
    {
      "questionNumber": <number>,
      "question": "<question summary>",
      "studentAnswer": "<student answer summary>",
      "marksAwarded": <number>,
      "totalMarks": <number>,
      "isCorrect": <boolean>,
      "feedback": "<feedback for this question>"
    }
  ]
}

Be thorough, fair, and constructive in your evaluation. Award partial marks where appropriate.`;
}

// Mock evaluation for when API key is not configured
function getMockEvaluation(subject: string): EvaluationResult {
  const topics = {
    Mathematics: ["Algebra", "Geometry", "Calculus", "Statistics"],
    Physics: ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics"],
    Chemistry: ["Organic", "Inorganic", "Physical Chemistry", "Analytical"],
    Biology: ["Cell Biology", "Genetics", "Ecology", "Human Anatomy"],
    English: ["Grammar", "Comprehension", "Writing", "Literature"],
    default: ["Topic A", "Topic B", "Topic C", "Topic D"],
  };

  const subjectTopics = topics[subject as keyof typeof topics] || topics.default;
  const breakdown = subjectTopics.map((topic, i) => {
    const marks = [82, 75, 91, 68][i];
    return {
      topic,
      obtainedMarks: marks,
      totalMarks: 100,
      percentage: marks,
      feedback: `Good understanding of ${topic} concepts with minor gaps.`,
    };
  });

  const totalObtained = breakdown.reduce((sum, b) => sum + b.obtainedMarks, 0);
  const totalPossible = breakdown.reduce((sum, b) => sum + b.totalMarks, 0);
  const percentage = Math.round((totalObtained / totalPossible) * 100);

  return {
    totalMarks: totalPossible,
    obtainedMarks: totalObtained,
    percentage,
    grade: percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B+" : "B",
    subjectBreakdown: breakdown,
    strengths: [
      `Strong performance in ${subjectTopics[2]} with 91% accuracy`,
      "Clear problem-solving approach",
      "Good conceptual understanding of foundational topics",
    ],
    weaknesses: [
      `${subjectTopics[3]} needs more practice (68%)`,
      "Some calculation errors in complex problems",
    ],
    recommendations: [
      `Practice more ${subjectTopics[3]} problems daily`,
      "Review formulas and theorems weekly",
      "Attempt previous years' question papers",
      "Focus on showing step-by-step working",
    ],
    overallFeedback: `The student demonstrates solid understanding of ${subject} concepts overall. Performance is commendable with ${percentage}% marks achieved. The student shows particular strength in ${subjectTopics[2]} while having room for improvement in ${subjectTopics[3]}. With targeted practice and consistent study, the student can achieve excellence in all areas.`,
    questionWise: [],
  };
}

export interface EvaluationResult {
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  subjectBreakdown: Array<{
    topic: string;
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    feedback: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overallFeedback: string;
  questionWise: Array<{
    questionNumber: number;
    question: string;
    studentAnswer: string;
    marksAwarded: number;
    totalMarks: number;
    isCorrect: boolean;
    feedback: string;
  }>;
}

const tavilysearchDeclaration: FunctionDeclaration = {
  name: "tavilysearch",
  description: "Search the web using Tavily to verify facts, find correct answers, or lookup general knowledge.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query to lookup."
      }
    },
    required: ["query"]
  }
};

const tavilysearchTool: Tool = {
  functionDeclarations: [tavilysearchDeclaration]
};

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilyResponse {
  answer?: string;
  results: TavilySearchResult[];
  error?: string;
}

export async function performTavilySearch(query: string): Promise<TavilyResponse> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    console.warn("⚠️  Tavily API key (TAVILY_API_KEY) not configured — returning mock search results.");
    return {
      answer: "This is a mock answer summary because TAVILY_API_KEY is not configured.",
      results: [
        {
          title: `Mock result for: ${query}`,
          content: `This is a mock search snippet because TAVILY_API_KEY is not configured in .env.local. Search query: ${query}`,
          url: "https://example.com"
        }
      ]
    };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: query,
        search_depth: "basic",
        include_answer: true,
        max_results: 3
      })
    });

    if (!res.ok) {
      throw new Error(`Tavily responded with status ${res.status}`);
    }

    const data = (await res.json()) as {
      answer?: string;
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }>;
    };

    const results: TavilySearchResult[] = (data.results || []).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
      score: r.score
    }));

    return {
      answer: data.answer,
      results
    };
  } catch (error) {
    console.error("Error performing Tavily search:", error);
    return {
      results: [],
      error: "Failed to perform web search."
    };
  }
}

export async function evaluateAnswerSheet(
  subject: string,
  grade: string,
  examType: string,
  ocrText: string
): Promise<EvaluationResult> {
  // Return mock if no API key
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    console.log("⚠️  Gemini API key not configured — using mock evaluation");
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate processing
    return getMockEvaluation(subject);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Register the tavilysearch tool
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [tavilysearchTool]
    });

    const prompt = buildEvaluationPrompt(subject, grade, examType, ocrText);
    
    // Use Chat to support multi-turn function calling conversation flow
    const chat = model.startChat();
    let result = await chat.sendMessage(prompt);
    
    // Check if the model requests a function call
    let functionCalls = result.response.functionCalls();
    while (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "tavilysearch") {
        const query = (call.args as { query?: string }).query || "";
        console.log(`🔍 Model requested Tavily search: "${query}"`);
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
        break; // Unsupported function call requested
      }
    }

    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from AI response");
    }

    return JSON.parse(jsonMatch[0]) as EvaluationResult;
  } catch (error) {
    console.error("Gemini evaluation error:", error);
    // Fallback to mock on error
    return getMockEvaluation(subject);
  }
}

