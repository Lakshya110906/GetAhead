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
    topicAddressed: "linked list traversal",
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

  // Test case 18: prompt-injection robustness — off-topic drift must still
  // be caught, but as a warning, never a hard gate (see the "four rounds of
  // incidents" comment on the topic check in paperValidation.ts — this
  // heuristic isn't trustworthy enough to block a delivery on its own).
  it("warns on gross off-topic drift (prompt-injection redirect to an unrelated subject), but still delivers the paper", () => {
    const offTopic = paper({
      sections: [
        {
          title: "Section A: Short Answer",
          description: "desc",
          questions: [
            q({ number: 1, question: "Describe how to bake a chocolate cake.", topicAddressed: "baking", marks: 15, markScheme: [{ point: "p", marks: 15 }] }),
            q({ number: 2, question: "What temperature should an oven be preheated to?", topicAddressed: "cooking temperatures", marks: 15, markScheme: [{ point: "p", marks: 15 }] }),
          ],
        },
      ],
    });
    const result = validatePaper(offTopic, baseCtx);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.warnings.some((w) => w.includes("didn't clearly match"))).toBe(true);
  });

  it("does not warn on on-topic questions even with only partial keyword overlap per question", () => {
    const onTopic = paper({
      sections: [
        {
          title: "Section A: Short Answer",
          description: "desc",
          questions: [
            q({ number: 1, question: "Explain how a linked list stores elements in memory.", topicAddressed: "linked lists", marks: 15, markScheme: [{ point: "p", marks: 15 }] }),
            q({ number: 2, question: "Describe the time complexity of array insertion.", topicAddressed: "array time complexity", marks: 15, markScheme: [{ point: "p", marks: 15 }] }),
          ],
        },
      ],
    });
    const result = validatePaper(onTopic, baseCtx);
    expect(result.warnings).toEqual([]);
  });

  // Regression test for a real, confirmed-live incident: topic "trignometry
  // and geometry" (typo — missing the "o"), 15 genuinely correct
  // trigonometry/geometry questions, rejected on all 3 attempts because none
  // of them contained the literal misspelled substring. Must not warn:
  // topicAddressed is checked, and the keyword set includes the
  // spellcheck-corrected "trigonometry" even though the raw topic wasn't changed.
  it("does not warn on genuinely on-topic questions because the user's topic input has a typo", () => {
    const trigCtx = {
      targetTotalMarks: 30,
      allowedQuestionTypes: ["Short Answer"],
      topic: "trignometry and geometry",
      parsedConstraints: parseCustomInstructions(""),
    };
    const trigPaper = paper({
      sections: [
        {
          title: "Section A: Short Answer",
          description: "desc",
          questions: [
            q({
              number: 1,
              question: "What is the value of sin 30 degrees + cos 60 degrees?",
              topicAddressed: "trigonometric ratios",
              marks: 15,
              markScheme: [{ point: "p", marks: 15 }],
            }),
            q({
              number: 2,
              question: "From an external point Q, a tangent QT is drawn to a circle with centre O...",
              topicAddressed: "circle geometry — tangents",
              marks: 15,
              markScheme: [{ point: "p", marks: 15 }],
            }),
          ],
        },
      ],
    });
    const result = validatePaper(trigPaper, trigCtx);
    expect(result.warnings).toEqual([]);
  });

  // Regression case for the other half of the original bug class: literal
  // substring matching fails not just on typos but on any question that
  // genuinely tests a topic without ever using the topic's own word. A
  // right-triangle/Pythagorean question is real trigonometry-adjacent
  // geometry content even though its topicAddressed field says neither
  // "trigonometry" nor "geometry" verbatim. Passes without a warning
  // because the check tolerates a MINORITY of such questions (gross-drift
  // detection, not a per-question keyword mandate).
  it("does not warn on a question that genuinely tests the topic without naming it, as long as it's not the majority", () => {
    const trigCtx = {
      targetTotalMarks: 30,
      allowedQuestionTypes: ["Short Answer"],
      topic: "trigonometry and geometry",
      parsedConstraints: parseCustomInstructions(""),
    };
    const trigPaper = paper({
      sections: [
        {
          title: "Section A: Short Answer",
          description: "desc",
          questions: [
            q({
              number: 1,
              question: "Prove that (1 - cos^2 A) / (1 - sin^2 A) = tan^2 A.",
              topicAddressed: "trigonometry — identities",
              marks: 15,
              markScheme: [{ point: "p", marks: 15 }],
            }),
            q({
              number: 2,
              question: "A ladder 10m long leans against a wall, its foot 6m from the wall. How high up the wall does it reach?",
              // Deliberately contains neither "trigonometry" nor "geometry" —
              // this is the Pythagorean theorem, real content for this
              // topic, described without the topic's own words.
              topicAddressed: "right triangle relationships",
              marks: 15,
              markScheme: [{ point: "p", marks: 15 }],
            }),
          ],
        },
      ],
    });
    const result = validatePaper(trigPaper, trigCtx);
    expect(result.warnings).toEqual([]);
  });

  // ── Regression suite for the topic-check incidents (2026-08-12,
  // 2026-08-16). Two separate root causes, fixed at different times:
  //   1. (2026-08-12) The generator's own prompt told the model
  //      topicAddressed could honestly omit the topic's exact word, while
  //      this check required literal containment — a self-contradiction.
  //      Fixed by requiring the prompt to always name the topic explicitly.
  //   2. (2026-08-16) Even with (1) fixed, plain substring containment is
  //      blind to English noun/adjective suffix pairs: "trigonometry" is
  //      not a substring of "trigonometric", nor "geometry" of "geometric"
  //      — so a live "trigonometry" generation still failed, 11 of 12
  //      genuinely on-topic questions rejected, because the model's own
  //      natural phrasing ("Trigonometric ratios...") used the adjective.
  //      Fixed with a shared-prefix fallback match (fuzzyKeywordMatch) AND,
  //      independently, by making the whole check non-blocking — a warning
  //      can never again stop a user from getting an on-topic paper, no
  //      matter what future gap the matching heuristic still has.
  // These tests lock in every case from both incident reports so neither
  // can regress silently again.
  function topicCtx(topic: string, overrides: Partial<typeof baseCtx> = {}) {
    return { targetTotalMarks: 30, allowedQuestionTypes: ["Short Answer"], topic, parsedConstraints: parseCustomInstructions(""), ...overrides };
  }

  function geometryPaper(topicAddresseds: string[]) {
    return paper({
      sections: [
        {
          title: "Section A: Short Answer",
          description: "desc",
          questions: topicAddresseds.map((ta, i) =>
            q({ number: i + 1, marks: 30 / topicAddresseds.length, markScheme: [{ point: "p", marks: 30 / topicAddresseds.length }], topicAddressed: ta })
          ),
        },
      ],
    });
  }

  it("passes for topic \"geometry\" — minimal case", () => {
    const result = validatePaper(geometryPaper(["Geometry — properties of similar triangles"]), topicCtx("geometry"));
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("passes for topic \"trigonometry\" using the model's natural adjective phrasing (no whitespace)", () => {
    // Deliberately does NOT contain the literal noun "trigonometry" — this
    // is the exact shape of the 2026-08-16 live incident.
    const result = validatePaper(geometryPaper(["Trigonometric ratios — angle of elevation"]), topicCtx("trigonometry"));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("passes for topic \"trigonometry \" (trailing space)", () => {
    const result = validatePaper(geometryPaper(["Trigonometric ratios — angle of elevation"]), topicCtx("trigonometry "));
    expect(result.warnings).toEqual([]);
  });

  it("passes for topic \" trigonometry\" (leading space)", () => {
    const result = validatePaper(geometryPaper(["Trigonometric ratios — angle of elevation"]), topicCtx(" trigonometry"));
    expect(result.warnings).toEqual([]);
  });

  it("passes for topic \"Trigonometry\" (capitalized)", () => {
    const result = validatePaper(geometryPaper(["Trigonometric ratios — angle of elevation"]), topicCtx("Trigonometry"));
    expect(result.warnings).toEqual([]);
  });

  it("passes for topic \"trigonometry and geometry\" (multi-word topic, adjective phrasing for both)", () => {
    const result = validatePaper(
      geometryPaper(["Trigonometric identities", "Geometric properties of circle tangents"]),
      topicCtx("trigonometry and geometry")
    );
    expect(result.warnings).toEqual([]);
  });

  it("passes for topic \"algebra\" — the noun happens to be a literal prefix of its own adjective (\"algebraic\")", () => {
    const result = validatePaper(geometryPaper(["Algebraic expressions and identities"]), topicCtx("algebra"));
    expect(result.warnings).toEqual([]);
  });

  it("passes for a misspelled topic (\"trignometry\") when the model correctly spells it in topicAddressed", () => {
    // The typo is caught and offered as a suggestion at input time
    // (topicSpellcheck.ts, wired into the enqueue route) — this covers the
    // case where the user declined that suggestion and generation proceeded
    // with the misspelled topic as-is. Must never burn a repair cycle over
    // a spelling difference the model itself already corrected.
    const result = validatePaper(geometryPaper(["Trigonometric ratios — standard angles"]), topicCtx("trignometry"));
    expect(result.warnings).toEqual([]);
  });

  it("does not warn on a genuinely on-topic question that tests geometry without the word \"geometry\" (minority case)", () => {
    const result = validatePaper(
      geometryPaper(["Geometry — coordinate distance formula", "Properties and angle sums of triangles"]),
      topicCtx("geometry")
    );
    expect(result.warnings).toEqual([]);
  });

  it("still flags a genuinely off-topic paper for topic \"geometry\" — as a warning, and still delivers it", () => {
    const offTopicPaper = geometryPaper([
      "Photosynthesis and cellular respiration",
      "The French Revolution's causes",
      "Basic supply and demand economics",
    ]);
    const result = validatePaper(offTopicPaper, topicCtx("geometry"));
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.warnings.some((w) => w.includes("didn't clearly match"))).toBe(true);
  });

  // Direct replay of a real incident's persisted data (job
  // cmsq46gvx0003ie04puwp73et, 2026-08-12): 12 questions, every
  // topicAddressed genuinely contains "geometry" or "Geometry". Must always
  // pass cleanly — if it doesn't, something regressed the matching logic.
  it("passes the 2026-08-12 incident's exact 12-question topicAddressed set", () => {
    const realTopicAddresseds = [
      "Ratio of areas of similar triangles (Geometry)",
      "Definition and properties of a tangent to a circle (Geometry)",
      "Distance formula in coordinate geometry",
      "Midpoint formula in coordinate geometry",
      "Application of Pythagoras theorem (Geometry)",
      "Basic Proportionality Theorem (Thales Theorem) (Geometry)",
      "AA similarity criterion for triangles (Geometry)",
      "Properties of tangents from an external point to a circle (Geometry)",
      "Angles subtended by a chord at the center and circumference of a circle (Geometry)",
      "Section formula for internal division in coordinate geometry",
      "Proof of the theorem on the ratio of areas of similar triangles (Geometry)",
      "Area of a triangle using coordinate geometry",
    ];
    const result = validatePaper(geometryPaper(realTopicAddresseds), topicCtx("geometry"));
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  // Direct replay of the 2026-08-16 live incident: a real "trigonometry"
  // generation (gemini-2.5-flash, live API call, not a fixture) produced
  // these exact 12 topicAddressed values. 11 of 12 used the natural
  // adjective "trigonometric" rather than the noun "trigonometry", and were
  // rejected outright by the old plain-substring check. Must now pass
  // cleanly via fuzzyKeywordMatch's shared-prefix fallback — if this
  // regresses, the noun/adjective bug is back.
  it("passes the 2026-08-16 incident's exact 12-question topicAddressed set (real Gemini output)", () => {
    const realTopicAddresseds = [
      "Trigonometric ratios of acute angles",
      "Trigonometric identities (basic)",
      "Values of trigonometric ratios for specific angles (0, 30, 45, 60, 90 degrees)",
      "Values of trigonometric ratios for specific angles (0, 30, 45, 60, 90 degrees)",
      "Trigonometric identities (basic)",
      "Trigonometric ratios of acute angles",
      "Applications of trigonometric identities",
      "Solving problems involving trigonometric ratios",
      "Complementary angles in trigonometry",
      "Solving problems involving trigonometric ratios",
      "Proofs of trigonometric identities",
      "Heights and Distances (basic applications)",
    ];
    const result = validatePaper(geometryPaper(realTopicAddresseds), topicCtx("trigonometry"));
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
    // Q12 ("Heights and Distances") shares no meaningful prefix with
    // "trigonometry" — 1/12 is below the >50% threshold, so this correctly
    // produces no warning at all, not just a non-blocking one.
    expect(result.warnings).toEqual([]);
  });

  it("fuzzyKeywordMatch's shared-prefix fallback does not create false positives between unrelated similar-looking words", () => {
    // "geology" and "geometry" share only a "geo" prefix before diverging —
    // must NOT match. If this regresses, the fuzzy fallback has become too
    // permissive.
    const result = validatePaper(geometryPaper(["Geological rock formations", "Plate tectonics"]), topicCtx("geometry"));
    expect(result.warnings.some((w) => w.includes("didn't clearly match"))).toBe(true);
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
