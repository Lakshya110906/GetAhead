import type { GeneratedPaperShape } from "./questionPaperSchema";
import type { ParsedConstraints } from "./paperConstraintParser";
import { suggestTopicCorrection } from "./topicSpellcheck";
export { computeTimeAllowed } from "./timeAllowed";

// The hard content-validation gate. Structured output + Zod (questionPaperSchema.ts)
// guarantee the SHAPE is right. This file guarantees the CONTENT actually
// satisfies what the user asked for — the two are independent failure
// classes, and the reported bug ("Total Marks: 6" when 30 was requested,
// with the mock fallback masquerading as a real paper) is squarely in this
// second class. Every check here returns a plain-language violation string
// specific enough to hand straight back to the model in a repair prompt
// ("the marks sum to 6 but must sum to 30").

export interface ValidationContext {
  targetTotalMarks: number;
  allowedQuestionTypes: string[]; // e.g. ["MCQ", "Short", "Long"] (schema's internal names)
  topic: string;
  parsedConstraints: ParsedConstraints;
}

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  // Non-blocking. Never affects `valid` — see the topic check below for why.
  warnings: string[];
}

const PLACEHOLDER_PATTERNS = [/\bENTER\b/i, /\bTODO\b/i, /\[insert/i, /\bXXX+\b/, /lorem ipsum/i];

const STOPWORDS = new Set([
  "the","a","an","and","or","of","in","on","to","for","with","is","are","was","were","be","this","that",
  "how","what","why","when","which","its","it","as","by","from","at","into","about","using","use","between",
]);

// Includes both the raw topic's own significant words AND any spellcheck
// correction of them (see topicSpellcheck.ts) — so a typo the user declined
// to fix ("trignometry") still matches a correctly-spelled self-reported
// topic ("trigonometry") instead of silently failing forever. This is
// belt-and-suspenders with the input-time suggestion in the enqueue route:
// that one lets the user fix it before generation starts; this one means
// validation doesn't regress into the same bug if they don't.
function topicKeywords(topic: string): string[] {
  const base = topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const correction = suggestTopicCorrection(topic);
  if (!correction) return base;
  return [...new Set([...base, ...correction.correctedWords.map((c) => c.to)])];
}

function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

// Plain substring containment (the check's only comparison until this fix)
// is blind to English's own noun/adjective suffixes: "trigonometry" is not
// a substring of "trigonometric", nor "geometry" of "geometric" — both
// diverge in their last couple of characters despite being the same word.
// "algebra"/"algebraic" happens to survive plain .includes() (the noun IS a
// prefix of the adjective there), which is exactly why this bug was topic-
// dependent rather than universal, and easy to miss in ad hoc testing.
// Confirmed live: a real "trigonometry" generation produced 12 genuinely
// on-topic questions whose topicAddressed fields almost all read
// "Trigonometric ..." — 11 of 12 failed plain substring containment.
// Falls back to a shared-prefix match (allowing roughly the last 2
// characters of the shorter word to differ) only when the keyword is long
// enough for that to be safe — "geology" vs "geometry" still correctly
// don't match (they diverge after "geo", well before the tolerance band).
function fuzzyKeywordMatch(text: string, keyword: string): boolean {
  if (text.includes(keyword)) return true;
  if (keyword.length < 5) return false;
  return text.split(/[^a-z0-9]+/).some((word) => {
    if (word.length < 5) return false;
    const shorter = Math.min(word.length, keyword.length);
    return commonPrefixLength(word, keyword) >= shorter - 2;
  });
}

export function validatePaper(paper: GeneratedPaperShape, ctx: ValidationContext): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  const allQuestions = paper.sections.flatMap((s) => s.questions);

  // 1. Sum of question marks equals target total exactly.
  const sumMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);
  if (Math.abs(sumMarks - ctx.targetTotalMarks) > 0.01) {
    violations.push(`the marks sum to ${sumMarks} but must sum to exactly ${ctx.targetTotalMarks}`);
  }

  // 2. Question count matches if the user specified one explicitly.
  const { impliedQuestionCount, impliedMarksPerQuestion, impliedQuestionTypes } = ctx.parsedConstraints;
  if (impliedQuestionCount !== null && allQuestions.length !== impliedQuestionCount) {
    violations.push(`you produced ${allQuestions.length} questions but ${impliedQuestionCount} were requested`);
  }

  // 3. Marks per question match if specified (every question must carry that exact value).
  if (impliedMarksPerQuestion !== null) {
    const wrong = allQuestions.filter((q) => q.marks !== impliedMarksPerQuestion);
    if (wrong.length > 0) {
      violations.push(
        `${wrong.length} question(s) do not carry the requested ${impliedMarksPerQuestion} marks each (question numbers: ${wrong.map((q) => q.number).join(", ")})`
      );
    }
  }

  // 4. Only requested question types appear.
  const effectiveTypes = impliedQuestionTypes ?? ctx.allowedQuestionTypes;
  const schemaTypeNames = effectiveTypes.map((t) => (t === "Short Answer" ? "Short" : t === "Long Answer" ? "Long" : t));
  const disallowed = allQuestions.filter((q) => !schemaTypeNames.includes(q.type));
  if (disallowed.length > 0) {
    violations.push(
      `question(s) ${disallowed.map((q) => q.number).join(", ")} use a question type outside the requested set (${effectiveTypes.join(", ")})`
    );
  }

  // 5. Sections are contiguous and start at A. (Defense in depth: the caller
  // assigns section letters deterministically via assignSectionLetters()
  // before this runs, so this should always pass — but a hard gate is kept
  // here so a future code path that skips that step fails loudly instead of
  // silently shipping a "Section B" with no "Section A".)
  const letterPattern = /^Section ([A-Z]):/;
  const letters = paper.sections.map((s) => s.title.match(letterPattern)?.[1]);
  const expectedLetters = paper.sections.map((_, i) => String.fromCharCode(65 + i));
  if (letters.some((l, i) => l !== expectedLetters[i])) {
    violations.push(
      `sections must be labelled Section A, Section B, Section C... in order with no gaps (got: ${paper.sections.map((s) => s.title).join(" | ")})`
    );
  }

  // 6. Every question has a mark scheme entry, and its points sum to the question's marks.
  for (const q of allQuestions) {
    if (!q.markScheme || q.markScheme.length === 0) {
      violations.push(`question ${q.number} has no mark scheme (per-mark breakdown) — every question needs one`);
      continue;
    }
    const schemeSum = q.markScheme.reduce((s, p) => s + p.marks, 0);
    if (Math.abs(schemeSum - q.marks) > 0.01) {
      violations.push(
        `question ${q.number}'s mark scheme sums to ${schemeSum} but the question is worth ${q.marks} marks`
      );
    }
  }

  // 7. No placeholder text anywhere.
  const allText = JSON.stringify(paper);
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(allText)) {
      violations.push(`placeholder text matching ${pattern} found in the paper — replace it with real content`);
    }
  }

  // 8. Every question addresses the requested topic. Checked against the
  // model's own self-reported topicAddressed field (questionPaperSchema.ts),
  // NOT scanned from the question's free-form prose. Scanning prose was a
  // real, confirmed-live bug: a user's topic typo ("trignometry") never
  // appears in a correctly-spelled generated question ("trigonometry"), and
  // a genuinely on-topic question (a circle-tangent problem, for instance)
  // may never use the topic word at all. topicAddressed is short, model-
  // authored specifically to answer "what does this test", and matched with
  // fuzzyKeywordMatch (substring, with a shared-prefix fallback for
  // noun/adjective suffix pairs — see its own comment) against a keyword
  // set that also includes spellcheck-corrected forms of the user's topic.
  //
  // This is a heuristic over free-form model text, not a semantic
  // understanding of topical relevance, and four rounds of incidents on
  // this exact check (wiring the wrong field, a prompt self-contradiction,
  // a volatile retry-count, and now noun/adjective substring blindness)
  // is a track record, not bad luck. So this can only ever WARN, never
  // block: a false positive here must never stop a user from getting a
  // paper that is, per the question text itself, correctly on-topic.
  // Genuine off-topic drift (including a prompt-injection attempt to
  // redirect the paper to an unrelated subject) still gets flagged — just
  // as a review note attached to the delivered paper, not a rejection.
  const keywords = topicKeywords(ctx.topic);
  if (keywords.length > 0) {
    const offTopic = allQuestions.filter(
      (q) => !keywords.some((k) => fuzzyKeywordMatch(q.topicAddressed.toLowerCase(), k))
    );
    if (offTopic.length > allQuestions.length / 2) {
      warnings.push(
        `${offTopic.length} of ${allQuestions.length} questions' self-reported topics didn't clearly match "${ctx.topic}". This is a heuristic check and can be wrong for a valid topic — worth a quick read-through to confirm the paper covers what you asked for.`
      );
    }
  }

  return { valid: violations.length === 0, violations, warnings };
}

/**
 * Section titles are never trusted from the model as the authoritative
 * label — this is what let a real (non-mock) response legally produce
 * "Section B" with no "Section A" (questionPaperSchema.ts's title was, and
 * remains, an unconstrained free string). Instead of validating the model's
 * choice, the system assigns the letter itself from array order, and keeps
 * whatever descriptive name the model wrote after the colon.
 */
export function assignSectionLetters<T extends { title: string }>(sections: T[]): T[] {
  return sections.map((s, i) => {
    const letter = String.fromCharCode(65 + i);
    const descriptive = s.title.replace(/^Section\s+[A-Z]\s*[:\-]\s*/i, "").trim();
    return { ...s, title: `Section ${letter}: ${descriptive || defaultSectionName(i)}` };
  });
}

function defaultSectionName(i: number): string {
  return `Part ${i + 1}`;
}

