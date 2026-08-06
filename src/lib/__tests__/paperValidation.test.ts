import { describe, it, expect } from "vitest";
import { validatePaper, assignSectionLetters } from "@/lib/paperValidation";
import { computeTimeAllowed } from "@/lib/timeAllowed";
import { parseCustomInstructions } from "@/lib/paperConstraintParser";
import type { GeneratedPaperShape } from "@/lib/questionPaperSchema";

function q(overrides: Partial<GeneratedPaperShape["sections"][number]["questions"][number]> = {}) {
  return {
    number: 1,
    type: "Short" as const,
    question: "Explain a linked list traversal.",
    answer: "Full model answer.",
    markScheme: [{ point: "Explains traversal", marks: 3 }],
    marks: 3,
    ...overrides,
  };
}

function paper(overrides: Partial<GeneratedPaperShape> = {}): GeneratedPaperShape {
  return {
    title: "Test Paper",
    subject: "Data Structures & Algorithms (DSA)",
    grade: "Undergraduate",
    difficulty: "Medium",
    totalMarks: 30,
    sections: [
      {
        title: "Section A: Short Answer",
        description: "desc",
        questions: [
          q({ number: 1, marks: 10, markScheme: [{ point: "p1", marks: 10 }] }),
          q({ number: 2, marks: 10, markScheme: [{ point: "p2", marks: 10 }] }),
          q({ number: 3, marks: 10, markScheme: [{ point: "p3", marks: 10 }] }),
        ],
      },
    ],
    ...overrides,
  };
}

const baseCtx = {
  targetTotalMarks: 30,
  allowedQuestionTypes: ["Short Answer"],
  topic: "linked list and array",
  parsedConstraints: parseCustomInstructions(""),
};

describe("validatePaper", () => {
  // Reproduction case: marks sum to 6 instead of the requested 30.
  it("flags when marks don't sum to the target total (reproduction case shape)", () => {
    const broken = paper({
      sections: [
        {
          title: "Section B: Short Answer",
          description: "desc",
          questions: [q({ number: 1, marks: 3 }), q({ number: 2, marks: 3 })],
        },
      ],
    });
    const result = validatePaper(broken, baseCtx);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("sum to 6") && v.includes("30"))).toBe(true);
  });

  it("passes when marks sum exactly to the target and every gate is satisfied", () => {
    const good = paper();
    const result = validatePaper(good, baseCtx);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("flags a question count mismatch against an explicit parsed constraint", () => {
    const parsed = parseCustomInstructions("5 questions each of 10 marks");
    const ctx = { ...baseCtx, parsedConstraints: parsed };
    // Paper only has 3 questions, but 5 were "requested".
    const result = validatePaper(paper(), ctx);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("3 questions") && v.includes("5 were requested"))).toBe(true);
  });

  it("flags marks-per-question mismatch against an explicit parsed constraint", () => {
    const parsed = parseCustomInstructions("3 questions of 5 marks each");
    const ctx = { ...baseCtx, targetTotalMarks: 30, parsedConstraints: parsed };
    // Questions are worth 10 marks each, not the requested 5.
    const result = validatePaper(paper(), ctx);
    expect(result.violations.some((v) => v.includes("do not carry the requested 5 marks"))).toBe(true);
  });

  it("flags a disallowed question type", () => {
    const withMcq = paper({
      sections: [
        {
          title: "Section A: Mixed",
          description: "desc",
          questions: [q({ number: 1, type: "MCQ", marks: 30, markScheme: [{ point: "p", marks: 30 }], options: ["a", "b", "c", "d"], answer: "A" })],
        },
      ],
    });
    const result = validatePaper(withMcq, baseCtx); // allowedQuestionTypes only "Short Answer"
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("question type outside the requested set"))).toBe(true);
  });

  it("flags a section that doesn't start at A / isn't contiguous", () => {
    const badSections = paper({
      sections: [
        { title: "Section B: Short Answer", description: "desc", questions: [q({ number: 1, marks: 30, markScheme: [{ point: "p", marks: 30 }] })] },
      ],
    });
    const result = validatePaper(badSections, baseCtx);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("Section A"))).toBe(true);
  });

  it("flags a missing mark scheme", () => {
    const noScheme = paper({
      sections: [
        { title: "Section A: Short Answer", description: "desc", questions: [{ ...q({ number: 1, marks: 30 }), markScheme: [] }] },
      ],
    });
    const result = validatePaper(noScheme, baseCtx);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("no mark scheme"))).toBe(true);
  });

  it("flags a mark scheme that doesn't sum to the question's marks", () => {
    const badScheme = paper({
      sections: [
        {
          title: "Section A: Short Answer",
          description: "desc",
          questions: [q({ number: 1, marks: 30, markScheme: [{ point: "p", marks: 10 }] })],
        },
      ],
    });
    const result = validatePaper(badScheme, baseCtx);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("sums to 10 but the question is worth 30"))).toBe(true);
  });

  it("flags placeholder text anywhere in the paper", () => {
    const withPlaceholder = paper({ subject: "ENTER SUBJECT HERE" });
    const result = validatePaper(withPlaceholder, baseCtx);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("placeholder"))).toBe(true);
  });

  it("flags TODO / [insert / Lorem ipsum placeholders", () => {
    for (const placeholder of ["TODO: fill in", "[insert question here]", "Lorem ipsum dolor sit amet"]) {
      const withPlaceholder = paper({
        sections: [{ title: "Section A: X", description: "desc", questions: [q({ question: placeholder, marks: 30, markScheme: [{ point: "p", marks: 30 }] })] }],
      });
      const result = validatePaper(withPlaceholder, baseCtx);
      expect(result.valid).toBe(false);
    }
  });

  // Test case 18: prompt-injection robustness — off-topic drift must be caught.
  it("flags gross off-topic drift (prompt-injection redirect to an unrelated subject)", () => {
    const offTopic = paper({
      sections: [
        {
          title: "Section A: Short Answer",
          description: "desc",
          questions: [
            q({ number: 1, question: "Describe how to bake a chocolate cake.", marks: 15, markScheme: [{ point: "p", marks: 15 }] }),
            q({ number: 2, question: "What temperature should an oven be preheated to?", marks: 15, markScheme: [{ point: "p", marks: 15 }] }),
          ],
        },
      ],
    });
    const result = validatePaper(offTopic, baseCtx);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("don't reference the requested topic"))).toBe(true);
  });

  it("does not flag on-topic questions even with only partial keyword overlap per question", () => {
    const onTopic = paper({
      sections: [
        {
          title: "Section A: Short Answer",
          description: "desc",
          questions: [
            q({ number: 1, question: "Explain how a linked list stores elements in memory.", marks: 15, markScheme: [{ point: "p", marks: 15 }] }),
            q({ number: 2, question: "Describe the time complexity of array insertion.", marks: 15, markScheme: [{ point: "p", marks: 15 }] }),
          ],
        },
      ],
    });
    const result = validatePaper(onTopic, baseCtx);
    expect(result.violations.some((v) => v.includes("don't reference the requested topic"))).toBe(false);
  });
});

describe("assignSectionLetters", () => {
  it("assigns Section A, B, C... in order regardless of the model's own titles", () => {
    const sections = [
      { title: "Section B: Multiple Choice Questions", questions: [] },
      { title: "Whatever Weird Title", questions: [] },
      { title: "Section A: Short Answer", questions: [] },
    ];
    const result = assignSectionLetters(sections);
    expect(result[0].title).toBe("Section A: Multiple Choice Questions");
    expect(result[1].title).toBe("Section B: Whatever Weird Title");
    expect(result[2].title).toBe("Section C: Short Answer");
  });

  // This is the direct fix for defect (d): "Section B" with no "Section A".
  it("never produces a paper starting at Section B", () => {
    const sections = [{ title: "Section B: Short Answer Questions", questions: [] }];
    const result = assignSectionLetters(sections);
    expect(result[0].title).toMatch(/^Section A:/);
  });
});

describe("computeTimeAllowed", () => {
  it("is proportional to total marks, not a fixed default (reproduction case: 6 marks must not be 2 Hours)", () => {
    const time = computeTimeAllowed(6);
    expect(time).not.toBe("2 Hours");
    // 6 marks * 1.75 = 10.5 min, rounded up to 15, but floored to the 30-minute minimum.
    expect(time).toBe("30 Minutes");
  });

  it("scales up for larger papers", () => {
    // 100 marks * 1.75 = 175 min = 2h 55m -> rounds up to nearest 5 = 175.
    const time = computeTimeAllowed(100);
    expect(time).toContain("Hour");
  });

  it("never returns less than the 30-minute floor", () => {
    expect(computeTimeAllowed(1)).toBe("30 Minutes");
  });
});
