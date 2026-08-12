import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { validatePaper, assignSectionLetters } from "../src/lib/paperValidation";
import { buildValidationContext } from "../src/lib/question-agents";
import { parseCustomInstructions } from "../src/lib/paperConstraintParser";

// validatePaper() is a pure function — replay it against the REAL persisted
// config + draftPaper from a real failed job, no Gemini call needed. This
// isolates whether the bug is in generation (bad topicAddressed values) or
// in the check itself (good values, wrong comparison).

async function main() {
  const jobId = process.argv[2];
  if (!jobId) throw new Error("usage: tsx scripts/replay-topic-check.ts <jobId>");

  const job = await prisma.paperGenerationJob.findUniqueOrThrow({ where: { id: jobId } });
  const config = JSON.parse(job.config);
  const draft = JSON.parse(job.draftPaper!);
  const candidate = { ...draft, sections: assignSectionLetters(draft.sections) };

  const parsedConstraints = parseCustomInstructions(config.customPrompt);
  const ctx = buildValidationContext(config, parsedConstraints);

  console.log(`config.topic = ${JSON.stringify(config.topic)}`);
  console.log(`ctx.topic    = ${JSON.stringify(ctx.topic)}`);
  console.log(`ctx.topic === config.topic: ${ctx.topic === config.topic}`);

  const result = validatePaper(candidate, ctx);
  console.log(`\nvalidatePaper() result: valid=${result.valid}`);
  console.log(`violations: ${JSON.stringify(result.violations, null, 2)}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
