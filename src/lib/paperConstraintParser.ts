// Parses a user's free-text "custom instructions" for explicit, mechanical
// numeric constraints (question count, marks per question, total marks,
// section structure, question-type overrides) that can be checked against
// the structured form fields BEFORE any generation call is made.
//
// This is intentionally a pattern matcher over a small set of common,
// mechanical phrasings — not a general NLP instruction parser. The failure
// class this fixes ("5 questions of 10 marks each" silently not happening)
// is caused by handing an unconstrained instruction to an LLM and hoping its
// arithmetic and instruction-following are reliable; they are not. Anything
// this parser can extract deterministically should never be left to model
// compliance alone. Anything it can't extract falls through to the
// structured fields governing, which is the documented precedence rule
// (see PRECEDENCE below).

export interface ParsedConstraints {
  hasExplicitConstraints: boolean;
  impliedTotalMarks: number | null;
  impliedQuestionCount: number | null;
  impliedMarksPerQuestion: number | null;
  impliedSectionCount: number | null;
  impliedQuestionsPerSection: number | null;
  impliedSectionNames: string[] | null;
  impliedQuestionTypes: string[] | null;
  /** Human-readable description of what was parsed, for the conflict dialog and logs. */
  summary: string | null;
}

const EMPTY: ParsedConstraints = {
  hasExplicitConstraints: false,
  impliedTotalMarks: null,
  impliedQuestionCount: null,
  impliedMarksPerQuestion: null,
  impliedSectionCount: null,
  impliedQuestionsPerSection: null,
  impliedSectionNames: null,
  impliedQuestionTypes: null,
  summary: null,
};

const QUESTION_TYPE_ALIASES: Record<string, string> = {
  mcq: "MCQ",
  mcqs: "MCQ",
  "multiple choice": "MCQ",
  "multiple-choice": "MCQ",
  short: "Short Answer",
  "short answer": "Short Answer",
  "short answers": "Short Answer",
  long: "Long Answer",
  "long answer": "Long Answer",
  "long answers": "Long Answer",
  essay: "Long Answer",
};

export function parseCustomInstructions(rawText: string | undefined | null): ParsedConstraints {
  const text = (rawText || "").trim();
  if (!text) return { ...EMPTY };

  const result: ParsedConstraints = { ...EMPTY };
  const summaryParts: string[] = [];

  // Pattern: "3 sections, 2 questions each, 5 marks per question"
  // Checked first — it's the most specific shape, and if it matches we
  // shouldn't also let the looser "N questions of M marks" pattern below
  // double-match against the same numbers out of order.
  const sectionPattern =
    /(\d+)\s*sections?[,\s]+(\d+)\s*questions?\s*each[,\s]+(\d+)\s*marks?\s*(?:per\s*question|each)/i;
  const sectionMatch = text.match(sectionPattern);
  if (sectionMatch) {
    const sectionCount = parseInt(sectionMatch[1], 10);
    const questionsPerSection = parseInt(sectionMatch[2], 10);
    const marksPerQuestion = parseInt(sectionMatch[3], 10);
    result.impliedSectionCount = sectionCount;
    result.impliedQuestionsPerSection = questionsPerSection;
    result.impliedMarksPerQuestion = marksPerQuestion;
    result.impliedQuestionCount = sectionCount * questionsPerSection;
    result.impliedTotalMarks = sectionCount * questionsPerSection * marksPerQuestion;
    result.hasExplicitConstraints = true;
    summaryParts.push(
      `${sectionCount} sections, ${questionsPerSection} questions each, ${marksPerQuestion} marks per question (${result.impliedTotalMarks} marks total)`
    );
  }

  // Pattern: "5 questions each of 10 marks" / "5 questions of 10 marks each"
  // / "5 questions of 10 marks"
  if (!sectionMatch) {
    const countMarksPattern =
      /(\d+)\s*questions?\s*(?:each\s*)?of\s*(\d+)\s*marks?(?:\s*each)?/i;
    const countMarksMatch = text.match(countMarksPattern);
    if (countMarksMatch) {
      const count = parseInt(countMarksMatch[1], 10);
      const marksEach = parseInt(countMarksMatch[2], 10);
      result.impliedQuestionCount = count;
      result.impliedMarksPerQuestion = marksEach;
      result.impliedTotalMarks = count * marksEach;
      result.hasExplicitConstraints = true;
      summaryParts.push(`${count} questions of ${marksEach} marks each (${result.impliedTotalMarks} marks total)`);
    } else {
      // Reversed order: "10 marks each for 5 questions" / "10 marks per question, 5 questions"
      const reversedPattern = /(\d+)\s*marks?\s*(?:each|per\s*question)[,\s]+(?:for\s*)?(\d+)\s*questions?/i;
      const reversedMatch = text.match(reversedPattern);
      if (reversedMatch) {
        const marksEach = parseInt(reversedMatch[1], 10);
        const count = parseInt(reversedMatch[2], 10);
        result.impliedQuestionCount = count;
        result.impliedMarksPerQuestion = marksEach;
        result.impliedTotalMarks = count * marksEach;
        result.hasExplicitConstraints = true;
        summaryParts.push(`${count} questions of ${marksEach} marks each (${result.impliedTotalMarks} marks total)`);
      }
    }
  }

  // Fallback: a standalone total-marks statement not already captured above,
  // e.g. "total should be 50 marks" / "make it 50 marks total".
  if (result.impliedTotalMarks === null) {
    const totalPattern = /(?:total\s*(?:of\s*)?|make\s*it\s*)(\d+)\s*marks?(?:\s*total)?/i;
    const totalMatch = text.match(totalPattern);
    if (totalMatch) {
      result.impliedTotalMarks = parseInt(totalMatch[1], 10);
      result.hasExplicitConstraints = true;
      summaryParts.push(`total of ${result.impliedTotalMarks} marks`);
    }
  }

  // Explicit section names: "Section A: ..., Section B: ..." (2+ distinct
  // labels, in order of first appearance).
  const sectionNameMatches = [...text.matchAll(/section\s+([A-Z])\s*[:\-]\s*([^,.\n]+)/gi)];
  if (sectionNameMatches.length >= 2) {
    result.impliedSectionNames = sectionNameMatches.map((m) => `Section ${m[1].toUpperCase()}: ${m[2].trim()}`);
    result.hasExplicitConstraints = true;
    summaryParts.push(`explicit sections: ${result.impliedSectionNames.join("; ")}`);
  }

  // Question-type override: "only MCQs", "all short answer", "make them long answer questions".
  const typeOverridePattern = /(?:only|all|make\s*(?:it|them)?)\s*(mcqs?|multiple[- ]choice|short\s*answers?|long\s*answers?|essay)/gi;
  const typeMatches = [...text.matchAll(typeOverridePattern)];
  if (typeMatches.length > 0) {
    const types = new Set<string>();
    for (const m of typeMatches) {
      const key = m[1].toLowerCase().replace(/\s+/g, " ").trim();
      const mapped = QUESTION_TYPE_ALIASES[key] ?? QUESTION_TYPE_ALIASES[key.replace(/s$/, "")];
      if (mapped) types.add(mapped);
    }
    if (types.size > 0) {
      result.impliedQuestionTypes = [...types];
      result.hasExplicitConstraints = true;
      summaryParts.push(`question types restricted to: ${result.impliedQuestionTypes.join(", ")}`);
    }
  }

  result.summary = summaryParts.length > 0 ? summaryParts.join("; ") : null;
  return result;
}

export interface ConflictCheck {
  hasConflict: boolean;
  impliedTotal: number | null;
  fieldTotal: number;
  fieldQuestionTypes: string[];
  typeConflict: boolean;
  message: string | null;
}

/**
 * PRECEDENCE RULE (documented per explicit request — see also the comment
 * at the top of buildPlannerPrompt() where this is enforced in the prompt):
 *
 *   1. An explicit, parseable numeric instruction in the free-text field
 *      beats the structured "total marks" / "question types" fields —
 *      but ONLY after the conflict has been surfaced to the user and they
 *      picked it (see checkForConflict below). It is never applied silently.
 *   2. If free text has no parseable numeric constraint, the structured
 *      fields govern outright — there is nothing to conflict with.
 *   3. Anything neither of the above resolves (e.g. subtler stylistic
 *      requests, difficulty phrasing, topic emphasis) is left to model
 *      judgement, constrained only by the structural rules enforced in
 *      validatePaper() (paperValidation.ts) — model judgement never
 *      overrides a structural rule.
 */
export function checkForConflict(parsed: ParsedConstraints, fieldTotalMarks: number, fieldQuestionTypes: string[]): ConflictCheck {
  const typeConflict =
    parsed.impliedQuestionTypes !== null &&
    (parsed.impliedQuestionTypes.length !== fieldQuestionTypes.length ||
      !parsed.impliedQuestionTypes.every((t) => fieldQuestionTypes.includes(t)));

  const totalConflict = parsed.impliedTotalMarks !== null && parsed.impliedTotalMarks !== fieldTotalMarks;

  if (!totalConflict && !typeConflict) {
    return {
      hasConflict: false,
      impliedTotal: parsed.impliedTotalMarks,
      fieldTotal: fieldTotalMarks,
      fieldQuestionTypes,
      typeConflict: false,
      message: null,
    };
  }

  const parts: string[] = [];
  if (totalConflict) {
    const description =
      parsed.impliedQuestionCount !== null && parsed.impliedMarksPerQuestion !== null
        ? `${parsed.impliedQuestionCount} questions of ${parsed.impliedMarksPerQuestion} marks`
        : `${parsed.impliedTotalMarks} marks`;
    parts.push(
      `Your instructions ask for ${description} (${parsed.impliedTotalMarks} total), but the target is set to ${fieldTotalMarks} marks.`
    );
  }
  if (typeConflict) {
    parts.push(
      `Your instructions ask for ${parsed.impliedQuestionTypes!.join(", ")} questions, but ${fieldQuestionTypes.join(", ")} ${fieldQuestionTypes.length > 1 ? "are" : "is"} selected above.`
    );
  }

  return {
    hasConflict: true,
    impliedTotal: parsed.impliedTotalMarks,
    fieldTotal: fieldTotalMarks,
    fieldQuestionTypes,
    typeConflict,
    message: parts.join(" "),
  };
}
