import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import {
  getGenAI,
  runPlannerAgent,
  runGeneratorAgent,
  runReviewerAgent,
  buildValidationContext,
  type PaperConfig,
} from "../src/lib/question-agents";
import { validatePaper, assignSectionLetters } from "../src/lib/paperValidation";
import { parseCustomInstructions } from "../src/lib/paperConstraintParser";

// Section 2(a)/(b)/(c) experiment: does the Reviewer agent catch anything the
// Zod schema + validatePaper() (code, free, instant, deterministic) cannot?
// For each config: plan + generate ONCE (shared baseline), then branch —
// score the raw generator draft against validatePaper() as "reviewer OFF",
// and separately run the reviewer + re-score as "reviewer ON". Sharing the
// same draft between both conditions means the reviewer's diff isolates
// exactly what it changed, not noise from two different generations.

const MCQ_OPTION_COUNT = 4;
const VALID_MCQ_ANSWER_LETTERS = new Set(["A", "B", "C", "D"]);

interface PaperLike {
  sections: { questions: { number: number; type: string; question: string; answer: string; options?: string[]; marks: number; markScheme?: { point: string; marks: number }[] }[] }[];
}

// Per the generator's own prompt (question-agents.ts): MCQ options are plain
// text with no "A)"/"B)" prefix, and `answer` is the correct LETTER (A-D),
// not the option text itself — so the right invariant is "exactly 4 options"
// + "answer is a valid letter", not "answer appears verbatim in options"
// (an earlier version of this check compared answer against option TEXT and
// falsely flagged every MCQ as broken — corrected here before reporting).
function checkMcqIntegrity(paper: PaperLike): string[] {
  const problems: string[] = [];
  for (const s of paper.sections) {
    for (const q of s.questions) {
      if (q.type !== "MCQ") continue;
      const opts = q.options ?? [];
      if (opts.length !== MCQ_OPTION_COUNT) {
        problems.push(`Q${q.number}: MCQ has ${opts.length} options, expected ${MCQ_OPTION_COUNT}`);
      }
      if (!VALID_MCQ_ANSWER_LETTERS.has(q.answer.trim().toUpperCase())) {
        problems.push(`Q${q.number}: MCQ answer "${q.answer}" is not a valid option letter (A-D)`);
      }
    }
  }
  return problems;
}

const LATEX_MARKDOWN_PATTERN = /\$[^$]+\$|\\frac|\\times|\*\*[^*]+\*\*|^#{1,6}\s/m;

function checkPlainText(paper: PaperLike): string[] {
  const problems: string[] = [];
  for (const s of paper.sections) {
    for (const q of s.questions) {
      if (LATEX_MARKDOWN_PATTERN.test(q.question) || LATEX_MARKDOWN_PATTERN.test(q.answer)) {
        problems.push(`Q${q.number}: contains LaTeX/markdown formatting instead of plain text`);
      }
    }
  }
  return problems;
}

const CONFIGS: PaperConfig[] = [
  {
    subject: "Physics",
    grade: "10th",
    topic: "Laws of Motion",
    difficulty: "Medium",
    totalMarks: 20,
    questionTypes: ["MCQ", "Short Answer", "Long Answer"],
  },
  {
    subject: "History",
    grade: "8th",
    topic: "The Mughal Empire",
    difficulty: "Hard",
    totalMarks: 25,
    questionTypes: ["MCQ", "Short Answer"],
  },
];

async function main() {
  const genAI = getGenAI();

  for (const config of CONFIGS) {
    console.log(`\n=== ${config.subject} / ${config.grade} / ${config.difficulty} / ${config.totalMarks} marks ===`);
    const parsedConstraints = parseCustomInstructions(config.customPrompt);
    const ctx = buildValidationContext(config, parsedConstraints);

    let t0 = Date.now();
    const plan = await runPlannerAgent(genAI, config);
    const plannerMs = Date.now() - t0;

    t0 = Date.now();
    const draft = await runGeneratorAgent(genAI, config, plan);
    const generatorMs = Date.now() - t0;
    const draftCandidate = { ...draft, sections: assignSectionLetters(draft.sections) };

    t0 = Date.now();
    const reviewed = await runReviewerAgent(genAI, config, draft);
    const reviewerMs = Date.now() - t0;
    const reviewedCandidate = { ...reviewed, sections: assignSectionLetters(reviewed.sections) };

    const draftValidation = validatePaper(draftCandidate, ctx);
    const reviewedValidation = validatePaper(reviewedCandidate, ctx);
    const draftMcqProblems = checkMcqIntegrity(draftCandidate);
    const reviewedMcqProblems = checkMcqIntegrity(reviewedCandidate);
    const draftPlainTextProblems = checkPlainText(draftCandidate);
    const reviewedPlainTextProblems = checkPlainText(reviewedCandidate);

    console.log(`  planner:   ${plannerMs}ms`);
    console.log(`  generator: ${generatorMs}ms`);
    console.log(`  reviewer:  ${reviewerMs}ms`);
    console.log(`  --- WITHOUT reviewer (raw generator draft) ---`);
    console.log(`  code validation: ${draftValidation.valid ? "PASS" : "FAIL"} ${draftValidation.violations.length ? "- " + draftValidation.violations.join(" | ") : ""}`);
    console.log(`  MCQ integrity:   ${draftMcqProblems.length === 0 ? "PASS" : "FAIL - " + draftMcqProblems.join(" | ")}`);
    console.log(`  plain text:      ${draftPlainTextProblems.length === 0 ? "PASS" : "FAIL - " + draftPlainTextProblems.join(" | ")}`);
    console.log(`  --- WITH reviewer ---`);
    console.log(`  code validation: ${reviewedValidation.valid ? "PASS" : "FAIL"} ${reviewedValidation.violations.length ? "- " + reviewedValidation.violations.join(" | ") : ""}`);
    console.log(`  MCQ integrity:   ${reviewedMcqProblems.length === 0 ? "PASS" : "FAIL - " + reviewedMcqProblems.join(" | ")}`);
    console.log(`  plain text:      ${reviewedPlainTextProblems.length === 0 ? "PASS" : "FAIL - " + reviewedPlainTextProblems.join(" | ")}`);
    console.log(`  reviewNotes: ${JSON.stringify((reviewed as unknown as { reviewNotes?: string[] }).reviewNotes ?? [])}`);

    // Per-question diff: did the reviewer change the ANSWER or MARK SCHEME
    // content (the "factual/mathematical correctness" claim), vs only
    // cosmetic text (grammar/wording)?
    const draftQs = draftCandidate.sections.flatMap((s) => s.questions);
    const reviewedQs = reviewedCandidate.sections.flatMap((s) => s.questions);
    for (let i = 0; i < Math.min(draftQs.length, reviewedQs.length); i++) {
      const d = draftQs[i];
      const r = reviewedQs[i];
      const answerChanged = d.answer.trim() !== r.answer.trim();
      const questionChanged = d.question.trim() !== r.question.trim();
      const markSchemeChanged = JSON.stringify(d.markScheme) !== JSON.stringify(r.markScheme);
      if (answerChanged || questionChanged || markSchemeChanged) {
        console.log(
          `  Q${d.number} diff: question=${questionChanged} answer=${answerChanged} markScheme=${markSchemeChanged}`
        );
        if (answerChanged) {
          console.log(`    draft answer:    ${d.answer.slice(0, 150)}`);
          console.log(`    reviewed answer: ${r.answer.slice(0, 150)}`);
        }
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
