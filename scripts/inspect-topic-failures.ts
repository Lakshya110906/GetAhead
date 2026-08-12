import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { prisma } from "../src/lib/prisma";

// Reads the ACTUAL persisted rows for the two real failed runs described
// (2026-08-12, topics "trigonometry " and "geometry") straight out of the
// database — no new Gemini calls, no re-inference. Every value printed here
// is exactly what was stored during the real run.

async function main() {
  const jobs = await prisma.paperGenerationJob.findMany({
    where: {
      status: "failed",
      createdAt: { gte: new Date("2026-08-12T00:00:00Z") },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log(`Found ${jobs.length} failed paper-generation job(s) since 2026-08-12.\n`);

  for (const job of jobs) {
    const config = JSON.parse(job.config);
    console.log("=".repeat(90));
    console.log(`Job ${job.id} | created ${job.createdAt.toISOString()} | status=${job.status}`);
    console.log(`  raw config.topic: ${JSON.stringify(config.topic)}`);
    console.log(`  validationAttempt: ${job.validationAttempt}`);
    console.log(`  retryWorthwhile: ${job.retryWorthwhile}`);
    console.log(`  error (user-facing): ${job.error}`);
    console.log(`  internalError: ${job.internalError}`);

    if (job.repairAttempts) {
      const attempts = JSON.parse(job.repairAttempts);
      console.log(`\n  repairAttempts (${attempts.length}):`);
      attempts.forEach((a: { attempt: number; violations: string[]; outputChanged: boolean }) => {
        console.log(`    attempt ${a.attempt} | outputChanged=${a.outputChanged}`);
        a.violations.forEach((v: string) => console.log(`      - ${JSON.stringify(v)}`));
      });
    }

    if (job.draftPaper) {
      const draft = JSON.parse(job.draftPaper);
      const allQuestions = draft.sections.flatMap((s: { questions: unknown[] }) => s.questions);
      console.log(`\n  Final draftPaper's ${allQuestions.length} question(s) — topicAddressed field:`);
      allQuestions.forEach((q: { number: number; question: string; topicAddressed: string }, i: number) => {
        console.log(`    Q${i + 1} (#${q.number}): topicAddressed=${JSON.stringify(q.topicAddressed)}`);
        console.log(`         question: ${JSON.stringify(q.question.slice(0, 90))}${q.question.length > 90 ? "..." : ""}`);
      });
    } else {
      console.log("  (no draftPaper persisted)");
    }
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
