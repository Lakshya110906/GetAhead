import { FunctionDeclaration, Tool, SchemaType } from "@google/generative-ai";

// Answer-sheet extraction/grading used to live in this file
// (transcribeAnswerSheet / gradeTranscribedAnswerSheet / recomputeFromQuestionMarks
// / evaluateAnswerSheetFromFile) as a single transcribe-then-grade-as-one-blob
// pipeline. It has been replaced by the two-stage, per-question pipeline in
// answerSheetGrading.ts (extract structured questions with a vision call,
// then grade each one individually with a code-checked grounding quote) —
// see that file, evaluationWorker.ts, and the report for why. Nothing here
// still calls the old functions; they were deleted rather than kept behind a
// flag, per the explicit instruction that a mock/superseded path reachable in
// production is a bug, not a fallback worth keeping.

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

export const tavilysearchTool: Tool = {
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
