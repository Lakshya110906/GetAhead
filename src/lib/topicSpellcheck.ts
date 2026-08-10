// Input-time topic spellcheck — catches the class of bug that produced a
// real incident: a user typed "trignometry" (missing the "o"), the model
// correctly generated trigonometry questions spelled correctly, and the
// old prose-substring validator rejected all 15 of them because the two
// spellings never share a matching substring. Confirmed live: this failed
// identically on all 3 repair attempts, burning 5 real Gemini calls on a
// paper that was correct from the first draft.
//
// This module only SUGGESTS a correction against a seed vocabulary of
// common topics — it never blocks or silently rewrites a topic outside that
// vocabulary. Most real topics won't be in any fixed list; that's expected
// and fine. The point is catching the common, high-confidence typo case at
// input time, before three Gemini calls get spent discovering it the hard
// way.

const TOPIC_VOCABULARY = [
  // Mathematics
  "trigonometry", "geometry", "algebra", "calculus", "arithmetic", "statistics",
  "probability", "coordinate geometry", "mensuration", "number theory",
  "linear equations", "quadratic equations", "polynomials", "matrices",
  "vectors", "differentiation", "integration", "permutations", "combinations",
  // Physics
  "mechanics", "thermodynamics", "electromagnetism", "optics", "kinematics",
  "dynamics", "electricity", "magnetism", "gravitation", "waves", "acoustics",
  "modern physics", "nuclear physics", "semiconductors",
  // Chemistry
  "organic chemistry", "inorganic chemistry", "physical chemistry",
  "periodic table", "chemical bonding", "thermochemistry", "electrochemistry",
  "acids and bases", "chemical equilibrium", "atomic structure",
  // Biology
  "genetics", "evolution", "ecology", "physiology", "anatomy", "botany",
  "zoology", "cell biology", "biotechnology", "microbiology", "photosynthesis",
  "respiration", "reproduction", "human body systems",
  // English/language
  "grammar", "comprehension", "vocabulary", "literature", "poetry",
  "essay writing", "letter writing", "punctuation", "tenses",
  // History/social studies
  "history", "geography", "civics", "economics", "political science",
  "world war", "independence movement", "ancient civilizations",
  // Computer science
  "programming", "data structures", "algorithms", "databases", "networking",
  "operating systems", "computer architecture",
] as const;

// Classic dynamic-programming edit distance — small inputs (topic words),
// no need for anything fancier.
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// A 1-2 edit distance threshold occasionally flags a short, real, distinct
// word as a "typo" of a similarly-spelled vocabulary term (e.g. "geology"
// vs "ecology" — both real, both one edit apart). Accepted tradeoff: this
// only ever produces a SUGGESTION the user must explicitly confirm before
// it's applied (see the enqueue route's 409 flow) — declining keeps their
// original topic exactly as typed. A false-positive suggestion costs one
// extra click, not a wrong answer.
export interface TopicCorrection {
  original: string;
  suggestion: string;
  correctedWords: { from: string; to: string }[];
}

// Splits on non-letters (keeps multi-word vocab entries like "coordinate
// geometry" matchable as a whole against a two-word span of the input).
function tokenize(topic: string): string[] {
  return topic
    .trim()
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 0);
}

/**
 * Suggests a corrected topic string if (and only if) at least one word looks
 * like a near-miss typo of a known vocabulary term — close enough to be
 * confident, not so close it's just a legitimate different word. Returns
 * null when the topic already matches, or doesn't look like a typo of
 * anything in the vocabulary (the overwhelmingly common case, since most
 * legitimate topics aren't in this seed list at all).
 */
export function suggestTopicCorrection(topic: string): TopicCorrection | null {
  const words = tokenize(topic);
  if (words.length === 0) return null;

  const correctedWords: { from: string; to: string }[] = [];
  const outputWords = [...words];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length < 5) continue; // too short for edit-distance matching to be confident

    // Exact match (possibly as part of a multi-word vocab term) — nothing to fix.
    if ((TOPIC_VOCABULARY as readonly string[]).some((v) => v === word || v.split(" ").includes(word))) continue;

    let best: { term: string; distance: number } | null = null;
    for (const vocabTerm of TOPIC_VOCABULARY) {
      for (const vocabWord of vocabTerm.split(" ")) {
        if (Math.abs(vocabWord.length - word.length) > 2) continue; // cheap prefilter
        const distance = levenshtein(word, vocabWord);
        // Confident typo: 1-2 edits, and small relative to the word's length
        // (so "geometry" -> "geology" — a real different word 2 edits away
        // on a short word — doesn't get treated as a typo of "geometry").
        if (distance >= 1 && distance <= 2 && distance <= vocabWord.length * 0.3) {
          if (!best || distance < best.distance) best = { term: vocabWord, distance };
        }
      }
    }
    if (best) {
      correctedWords.push({ from: word, to: best.term });
      outputWords[i] = best.term;
    }
  }

  if (correctedWords.length === 0) return null;

  // Rebuild the suggestion preserving the original topic's separators/casing
  // shape as much as practical — simplest robust approach: word-by-word
  // case-insensitive replace against the original string.
  let suggestion = topic;
  for (const { from, to } of correctedWords) {
    suggestion = suggestion.replace(new RegExp(`\\b${from}\\b`, "i"), to);
  }

  return { original: topic, suggestion, correctedWords };
}
