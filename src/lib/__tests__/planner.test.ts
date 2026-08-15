import { describe, it, expect } from "vitest";
import { correctPlanMarks, planTotal, filterPlanToRequestedTypes, conformDraftToPlan } from "@/lib/question-agents";
import type { PlannerPlan, GeneratedPaperShape } from "@/lib/questionPaperSchema";

function section(overrides: Partial<PlannerPlan["sections"][number]> = {}) {
  return {
    title: "Section",
    description: "desc",
    questionType: "Short" as const,
    marksPerQuestion: 10,
    questionCount: 3,
    topicsCovered: ["linked lists"],
    ...overrides,
  };
}

describe("correctPlanMarks", () => {
  it("leaves an already-exact plan unchanged", () => {
    const plan: PlannerPlan = { sections: [section({ marksPerQuestion: 10, questionCount: 3 })] }; // 30
    const corrected = correctPlanMarks(plan, 30);
    expect(planTotal(corrected)).toBe(30);
  });

  // Reproduces the exact live-observed bug: a plan totalling 29 when 30 was requested.
  it("never leaves a 1-mark shortfall uncorrected (the exact reported off-by-one)", () => {
    const plan: PlannerPlan = { sections: [section({ marksPerQuestion: 10, questionCount: 2 })] }; // 20, needs +10 to hit 30... use a case that isn't evenly divisible
    const skewedPlan: PlannerPlan = {
      sections: [
        section({ marksPerQuestion: 3, questionCount: 3 }), // 9
        section({ marksPerQuestion: 4, questionCount: 5 }), // 20 -> total 29
      ],
    };
    const corrected = correctPlanMarks(skewedPlan, 30);
    expect(planTotal(corrected)).toBe(30);
  });

  it("guarantees an exact match even when no section's marksPerQuestion evenly divides the remainder", () => {
    // 3 questions * 4 marks = 12, target 30 -> diff 18, not divisible by 4 in a way that keeps count >= 1 cleanly for every case;
    // pick values where the old rounding fallback would have produced a fractional marksPerQuestion.
    const plan: PlannerPlan = { sections: [section({ marksPerQuestion: 4, questionCount: 3 })] }; // 12, diff = 18
    const corrected = correctPlanMarks(plan, 30);
    expect(planTotal(corrected)).toBe(30);
    // every section's marksPerQuestion must remain a whole number
    for (const s of corrected.sections) {
      expect(Number.isInteger(s.marksPerQuestion)).toBe(true);
      expect(Number.isInteger(s.questionCount)).toBe(true);
      expect(s.questionCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("handles a plan that over-allocates (needs to reduce, not just add)", () => {
    const plan: PlannerPlan = { sections: [section({ marksPerQuestion: 10, questionCount: 5 })] }; // 50, target 30
    const corrected = correctPlanMarks(plan, 30);
    expect(planTotal(corrected)).toBe(30);
  });

  it("handles multiple sections needing correction across a mixed-type plan", () => {
    const plan: PlannerPlan = {
      sections: [
        section({ questionType: "MCQ", marksPerQuestion: 1, questionCount: 10 }), // 10
        section({ questionType: "Short", marksPerQuestion: 5, questionCount: 4 }), // 20 -> total 30, target 75
      ],
    };
    const corrected = correctPlanMarks(plan, 75);
    expect(planTotal(corrected)).toBe(75);
  });

  it("is idempotent: correcting an already-correct plan again changes nothing", () => {
    const plan: PlannerPlan = { sections: [section({ marksPerQuestion: 7, questionCount: 4 })] }; // 28
    const once = correctPlanMarks(plan, 30);
    const twice = correctPlanMarks(once, 30);
    expect(planTotal(twice)).toBe(30);
    expect(twice).toEqual(once);
  });
});

describe("filterPlanToRequestedTypes", () => {
  // Reproduces the exact live-observed bug: request was "Short Answer only"
  // but the planner allocated MCQ and Long Answer sections too.
  it("drops sections whose type was not requested", () => {
    const plan: PlannerPlan = {
      sections: [
        section({ questionType: "MCQ" }),
        section({ questionType: "Short" }),
        section({ questionType: "Long" }),
      ],
    };
    const filtered = filterPlanToRequestedTypes(plan, ["Short Answer"]);
    expect(filtered.sections).toHaveLength(1);
    expect(filtered.sections[0].questionType).toBe("Short");
  });

  it("keeps all sections whose types were requested", () => {
    const plan: PlannerPlan = {
      sections: [section({ questionType: "MCQ" }), section({ questionType: "Short" })],
    };
    const filtered = filterPlanToRequestedTypes(plan, ["MCQ", "Short Answer"]);
    expect(filtered.sections).toHaveLength(2);
  });

  it("falls back to relabeling instead of returning an empty plan if nothing matches", () => {
    const plan: PlannerPlan = { sections: [section({ questionType: "MCQ" })] };
    const filtered = filterPlanToRequestedTypes(plan, ["Short Answer"]);
    expect(filtered.sections.length).toBeGreaterThan(0);
    expect(filtered.sections[0].questionType).toBe("Short");
  });
});

function draftQuestion(overrides: Partial<GeneratedPaperShape["sections"][number]["questions"][number]> = {}) {
  return {
    number: 1,
    type: "MCQ" as const,
    question: "q",
    options: ["a", "b", "c", "d"],
    answer: "a",
    markScheme: [{ point: "p", marks: 1 }],
    marks: 1,
    topicAddressed: "topic",
    ...overrides,
  };
}

function draftSection(questions: ReturnType<typeof draftQuestion>[]) {
  return { title: "Section A: X", description: "desc", questions };
}

describe("conformDraftToPlan", () => {
  // Direct reproduction of the real, live-observed incident (2026-08-16):
  // a 20-mark, MCQ + Short Answer request came back from the generator with
  // 30 questions summing to 70 marks, several of a disallowed type.
  it("trims a generator over-generation down to exactly what the plan asked for", () => {
    const plan: PlannerPlan = {
      sections: [
        { title: "Section A", description: "desc", questionType: "MCQ", marksPerQuestion: 1, questionCount: 6, topicsCovered: ["t"] },
        { title: "Section B", description: "desc", questionType: "Short", marksPerQuestion: 2, questionCount: 4, topicsCovered: ["t"] },
      ],
    };
    // Generator returned 10 MCQs (plan asked for 6) and 4 Short (matches).
    const overGenerated: GeneratedPaperShape = {
      title: "t", subject: "s", grade: "g", difficulty: "Medium", totalMarks: 999,
      sections: [
        draftSection(Array.from({ length: 10 }, (_, i) => draftQuestion({ number: i + 1, type: "MCQ", marks: 1 }))),
        draftSection(Array.from({ length: 4 }, (_, i) => draftQuestion({ number: 11 + i, type: "Short", marks: 2 }))),
      ],
    };
    const conformed = conformDraftToPlan(overGenerated, plan, ["MCQ", "Short Answer"]);
    expect(conformed.sections[0].questions).toHaveLength(6);
    expect(conformed.sections[1].questions).toHaveLength(4);
    const allQuestions = conformed.sections.flatMap((s) => s.questions);
    expect(allQuestions.reduce((sum, q) => sum + q.marks, 0)).toBe(6 * 1 + 4 * 2);
  });

  it("drops questions of a disallowed type entirely, even if that leaves a section short", () => {
    const plan: PlannerPlan = {
      sections: [{ title: "Section A", description: "desc", questionType: "MCQ", marksPerQuestion: 1, questionCount: 6, topicsCovered: ["t"] }],
    };
    // 6 MCQ as planned, plus a whole extra Long Answer section that was never requested.
    const overGenerated: GeneratedPaperShape = {
      title: "t", subject: "s", grade: "g", difficulty: "Medium", totalMarks: 999,
      sections: [
        draftSection(Array.from({ length: 6 }, (_, i) => draftQuestion({ number: i + 1, type: "MCQ", marks: 1 }))),
        draftSection([draftQuestion({ number: 7, type: "Long", marks: 5 })]),
      ],
    };
    // Only one section in the plan, so the extra section is dropped outright.
    const conformed = conformDraftToPlan(overGenerated, plan, ["MCQ"]);
    expect(conformed.sections).toHaveLength(1);
    expect(conformed.sections[0].questions).toHaveLength(6);
    expect(conformed.sections[0].questions.every((q) => q.type === "MCQ")).toBe(true);
  });

  it("renumbers sequentially after trimming so the delivered paper has no gaps", () => {
    const plan: PlannerPlan = {
      sections: [{ title: "Section A", description: "desc", questionType: "MCQ", marksPerQuestion: 1, questionCount: 2, topicsCovered: ["t"] }],
    };
    const overGenerated: GeneratedPaperShape = {
      title: "t", subject: "s", grade: "g", difficulty: "Medium", totalMarks: 999,
      sections: [draftSection(Array.from({ length: 5 }, (_, i) => draftQuestion({ number: i + 1, type: "MCQ", marks: 1 })))],
    };
    const conformed = conformDraftToPlan(overGenerated, plan, ["MCQ"]);
    expect(conformed.sections[0].questions.map((q) => q.number)).toEqual([1, 2]);
  });

  it("never adds questions back when a section is short — leaves it for the repair loop", () => {
    const plan: PlannerPlan = {
      sections: [{ title: "Section A", description: "desc", questionType: "MCQ", marksPerQuestion: 1, questionCount: 6, topicsCovered: ["t"] }],
    };
    const underGenerated: GeneratedPaperShape = {
      title: "t", subject: "s", grade: "g", difficulty: "Medium", totalMarks: 999,
      sections: [draftSection(Array.from({ length: 3 }, (_, i) => draftQuestion({ number: i + 1, type: "MCQ", marks: 1 })))],
    };
    const conformed = conformDraftToPlan(underGenerated, plan, ["MCQ"]);
    expect(conformed.sections[0].questions).toHaveLength(3);
  });

  it("is a no-op on a draft that already matches the plan exactly", () => {
    const plan: PlannerPlan = {
      sections: [{ title: "Section A", description: "desc", questionType: "MCQ", marksPerQuestion: 1, questionCount: 3, topicsCovered: ["t"] }],
    };
    const exact: GeneratedPaperShape = {
      title: "t", subject: "s", grade: "g", difficulty: "Medium", totalMarks: 3,
      sections: [draftSection(Array.from({ length: 3 }, (_, i) => draftQuestion({ number: i + 1, type: "MCQ", marks: 1 })))],
    };
    const conformed = conformDraftToPlan(exact, plan, ["MCQ"]);
    expect(conformed.sections[0].questions).toHaveLength(3);
    expect(conformed.sections[0].questions.map((q) => q.number)).toEqual([1, 2, 3]);
  });
});
