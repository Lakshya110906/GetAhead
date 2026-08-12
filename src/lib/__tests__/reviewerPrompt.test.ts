import { describe, it, expect } from "vitest";
import { buildReviewerPrompt } from "@/lib/question-agents";
import type { PaperConfig } from "@/lib/question-agents";
import type { GeneratedPaperShape } from "@/lib/questionPaperSchema";

// Zero-cost coverage for the Reviewer prompt narrowed in Section 2: its
// stated purpose is now primarily custom-instruction compliance, not a
// general "audit everything" pass. This asserts the prompt text actually
// reflects that without needing a live Gemini call — the reviewer's
// business logic (what it's told to prioritize) is testable independent of
// what the model does with it.

function makeConfig(overrides: Partial<PaperConfig> = {}): PaperConfig {
  return {
    subject: "Physics",
    grade: "10th",
    topic: "Laws of Motion",
    difficulty: "Medium",
    totalMarks: 20,
    questionTypes: ["MCQ", "Short Answer"],
    ...overrides,
  };
}

const draft: GeneratedPaperShape = {
  title: "Physics Test",
  subject: "Physics",
  grade: "10th",
  difficulty: "Medium",
  totalMarks: 5,
  sections: [
    {
      title: "Section A: MCQs",
      description: "Answer all questions",
      questions: [
        {
          number: 1,
          type: "MCQ",
          question: "What is Newton's first law?",
          options: ["A", "B", "C", "D"],
          answer: "A",
          topicAddressed: "Newton's laws of motion",
          markScheme: [{ point: "Selects correct option", marks: 5 }],
          marks: 5,
        },
      ],
    },
  ],
};

describe("buildReviewerPrompt", () => {
  it("puts custom-instruction compliance first when a custom prompt is present", () => {
    const config = makeConfig({ customPrompt: "Avoid numerical answers. Focus on conceptual questions only." });
    const prompt = buildReviewerPrompt(config, draft);
    expect(prompt).toContain("CUSTOM INSTRUCTION COMPLIANCE");
    expect(prompt).toContain("Avoid numerical answers. Focus on conceptual questions only.");
    // It's listed as priority 1, ahead of factual correctness and difficulty.
    const customIdx = prompt.indexOf("CUSTOM INSTRUCTION COMPLIANCE");
    const factualIdx = prompt.indexOf("FACTUAL AND MATHEMATICAL CORRECTNESS");
    const difficultyIdx = prompt.indexOf("DIFFICULTY CALIBRATION");
    expect(customIdx).toBeGreaterThan(-1);
    expect(customIdx).toBeLessThan(factualIdx);
    expect(customIdx).toBeLessThan(difficultyIdx);
  });

  it("tells the model to skip custom-instruction checking when there is no custom prompt", () => {
    const config = makeConfig({ customPrompt: undefined });
    const prompt = buildReviewerPrompt(config, draft);
    expect(prompt).toContain("If there is no custom prompt, skip this");
  });

  it("still asks for factual/mathematical correctness and difficulty calibration regardless of custom prompt", () => {
    const prompt = buildReviewerPrompt(makeConfig(), draft);
    expect(prompt).toContain("FACTUAL AND MATHEMATICAL CORRECTNESS");
    expect(prompt).toContain("DIFFICULTY CALIBRATION");
  });

  it("does not ask the model to change question count or marks", () => {
    const prompt = buildReviewerPrompt(makeConfig(), draft);
    expect(prompt).toContain("Do not change the number of questions");
  });

  // Regression: a live end-to-end run (topic "geometry" + a custom
  // instruction narrowing questions to circles) showed the reviewer can
  // rewrite topicAddressed as a side effect of custom-instruction
  // compliance edits, dropping the topic's own word even though the
  // generator's prompt (fixed separately) requires it — the reviewer never
  // had that same constraint, so its rewrites could reintroduce the exact
  // topic-validation failure the generator fix closed.
  it("requires topicAddressed to keep naming the topic even when a question is rewritten", () => {
    const config = makeConfig({ topic: "geometry", customPrompt: "Every question must involve circles specifically." });
    const prompt = buildReviewerPrompt(config, draft);
    expect(prompt).toContain("topicAddressed");
    expect(prompt).toContain('MUST still explicitly name the requested topic "geometry"');
  });
});
