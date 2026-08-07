import { prisma } from "@/lib/prisma";
import { refundQuota } from "@/lib/quota";
import {
  getGenAI,
  isGeminiConfigured,
  getMockQuestionPaper,
  runPlannerAgent,
  runGeneratorAgent,
  runReviewerAgent,
  runRepairAgent,
  correctPlanMarks,
  filterPlanToRequestedTypes,
  finalizePaper,
  buildValidationContext,
  withRetry,
  DailyQuotaExhaustedError,
  type PaperConfig,
  type RepairAttemptLog,
} from "@/lib/question-agents";
import { validatePaper, assignSectionLetters } from "@/lib/paperValidation";
import { parseCustomInstructions } from "@/lib/paperConstraintParser";
import type { PlannerPlan, GeneratedPaperShape } from "@/lib/questionPaperSchema";

// ─── Why a job model instead of one long-lived request ─────────────────────
// Three sequential Gemini calls plus a validation/repair loop (up to 2 extra
// full generator-schema calls) do not reliably fit inside one serverless
// invocation — confirmed live: production was killed by
// "Vercel Runtime Timeout Error: Task timed out after 120 seconds" while
// streaming SSE from exactly this kind of long-lived function. Instead of
// raising the timeout further (a real ceiling either way), each invocation
// of processJobStep() does exactly ONE step — one agent call, or one local
// validation check — persists the result to the job row, and returns. The
// job row is the durable source of truth; nothing is held in memory across
// invocations. This is what makes "kill the worker mid-job" survivable: the
// next call to processJobStep() (triggered either by the client's poll, see
// GET /api/papers/[id], or by the daily cron safety net) resumes from
// whatever was last persisted rather than starting over or losing the job.

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type JobStep = "planner" | "generator" | "reviewer" | "validate" | "repair" | "done";
export type AgentRunState = "queued" | "running" | "done" | "failed";

export interface AgentStates {
  planner: { status: AgentRunState; startedAt?: string; finishedAt?: string; error?: string };
  generator: { status: AgentRunState; startedAt?: string; finishedAt?: string; error?: string };
  reviewer: { status: AgentRunState; startedAt?: string; finishedAt?: string; error?: string };
}

export function initialAgentStates(): AgentStates {
  return {
    planner: { status: "queued" },
    generator: { status: "queued" },
    reviewer: { status: "queued" },
  };
}

// A stale lock (worker died mid-step without releasing it) is recoverable
// after this long — short enough that a real user isn't stuck waiting a
// full cron cycle, long enough that two pollers don't both grab the same
// step under normal latency.
const LOCK_STALE_MS = 20_000;
const MAX_STEP_ATTEMPTS = 3;

function backoffMs(attempt: number): number {
  return Math.min(30_000, 1000 * Math.pow(2, attempt)); // 1s, 2s, 4s... capped at 30s
}

/**
 * Attempts to advance a job by exactly one step. Safe to call repeatedly
 * and concurrently — a fresh, unexpired lock means another caller is
 * already handling this job, and this call is a no-op. Returns quickly in
 * all cases (a single Gemini call, at most).
 */
export async function processJobStep(jobId: string): Promise<void> {
  const job = await prisma.paperGenerationJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") return;

  if (job.lockedAt && Date.now() - job.lockedAt.getTime() < LOCK_STALE_MS) {
    return; // another invocation is actively working this job right now
  }

  // Respect backoff after a failed attempt on the current step before retrying.
  if (job.attemptCount > 0) {
    const sinceUpdate = Date.now() - job.updatedAt.getTime();
    if (sinceUpdate < backoffMs(job.attemptCount - 1)) return;
  }

  await prisma.paperGenerationJob.update({
    where: { id: jobId },
    data: { status: "running", lockedAt: new Date() },
  });

  const config: PaperConfig = JSON.parse(job.config);
  const agentStates: AgentStates = JSON.parse(job.agentStates);

  try {
    if (!isGeminiConfigured()) {
      // Local dev without credentials — resolve the whole job synchronously
      // with the existing mock, same as the old pipeline's no-key fallback.
      const paper = getMockQuestionPaper(config);
      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "succeeded",
          step: "done",
          finalPaper: JSON.stringify(paper),
          agentStates: JSON.stringify({
            planner: { status: "done" },
            generator: { status: "done" },
            reviewer: { status: "done" },
          }),
          lockedAt: null,
        },
      });
      return;
    }

    const genAI = getGenAI();

    if (job.step === "planner") {
      agentStates.planner = { status: "running", startedAt: new Date().toISOString() };
      await prisma.paperGenerationJob.update({ where: { id: jobId }, data: { agentStates: JSON.stringify(agentStates) } });

      const rawPlan = await withRetry(() => runPlannerAgent(genAI, config), "Planner Agent", 1);
      const plan = correctPlanMarks(filterPlanToRequestedTypes(rawPlan, config.questionTypes), config.totalMarks);
      agentStates.planner = { status: "done", startedAt: agentStates.planner.startedAt, finishedAt: new Date().toISOString() };

      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: {
          step: "generator",
          plannerPlan: JSON.stringify(plan),
          agentStates: JSON.stringify(agentStates),
          attemptCount: 0,
          lockedAt: null,
        },
      });
      return;
    }

    if (job.step === "generator") {
      if (!job.plannerPlan) throw new Error("Job reached the generator step with no planner plan persisted");
      const plan: PlannerPlan = JSON.parse(job.plannerPlan);

      agentStates.generator = { status: "running", startedAt: new Date().toISOString() };
      await prisma.paperGenerationJob.update({ where: { id: jobId }, data: { agentStates: JSON.stringify(agentStates) } });

      const draft = await withRetry(() => runGeneratorAgent(genAI, config, plan), "Generator Agent", 1);
      agentStates.generator = { status: "done", startedAt: agentStates.generator.startedAt, finishedAt: new Date().toISOString() };

      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: {
          step: "reviewer",
          draftPaper: JSON.stringify(draft),
          agentStates: JSON.stringify(agentStates),
          attemptCount: 0,
          lockedAt: null,
        },
      });
      return;
    }

    if (job.step === "reviewer") {
      if (!job.plannerPlan || !job.draftPaper) throw new Error("Job reached the reviewer step with no draft persisted");
      const plan: PlannerPlan = JSON.parse(job.plannerPlan);
      const draft: GeneratedPaperShape = JSON.parse(job.draftPaper);

      agentStates.reviewer = { status: "running", startedAt: new Date().toISOString() };
      await prisma.paperGenerationJob.update({ where: { id: jobId }, data: { agentStates: JSON.stringify(agentStates) } });

      const reviewed = await withRetry(() => runReviewerAgent(genAI, config, plan, draft), "Reviewer Agent", 1);
      agentStates.reviewer = { status: "done", startedAt: agentStates.reviewer.startedAt, finishedAt: new Date().toISOString() };

      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: {
          step: "validate",
          draftPaper: JSON.stringify(reviewed),
          agentStates: JSON.stringify(agentStates),
          attemptCount: 0,
          lockedAt: null,
        },
      });
      return;
    }

    if (job.step === "validate") {
      if (!job.draftPaper) throw new Error("Job reached validate with no draft persisted");
      const draft: GeneratedPaperShape = JSON.parse(job.draftPaper);
      const candidate = { ...draft, sections: assignSectionLetters(draft.sections) };
      const parsedConstraints = parseCustomInstructions(config.customPrompt);
      const ctx = buildValidationContext(config, parsedConstraints);
      const validation = validatePaper(candidate, ctx);

      const attemptLogs: RepairAttemptLog[] = job.repairAttempts ? JSON.parse(job.repairAttempts) : [];
      const attemptNumber = job.validationAttempt + 1;
      attemptLogs.push({ attempt: attemptNumber, violations: validation.violations });

      if (validation.valid) {
        const finalPaper = finalizePaper(candidate, config.totalMarks);
        finalPaper.repairAttempts = attemptLogs;
        await prisma.paperGenerationJob.update({
          where: { id: jobId },
          data: {
            status: "succeeded",
            step: "done",
            finalPaper: JSON.stringify(finalPaper),
            draftPaper: JSON.stringify(candidate),
            repairAttempts: JSON.stringify(attemptLogs),
            validationAttempt: attemptNumber,
            lockedAt: null,
          },
        });
        return;
      }

      if (attemptNumber >= MAX_STEP_ATTEMPTS) {
        await prisma.paperGenerationJob.update({
          where: { id: jobId },
          data: {
            status: "failed",
            error: `Paper failed validation after ${attemptNumber} attempts: ${validation.violations.join("; ")}`,
            repairAttempts: JSON.stringify(attemptLogs),
            validationAttempt: attemptNumber,
            retryWorthwhile: true,
            lockedAt: null,
          },
        });
        await refundQuota(job.userId, "PAPER_GENERATION");
        return;
      }

      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: {
          step: "repair",
          draftPaper: JSON.stringify(candidate),
          repairAttempts: JSON.stringify(attemptLogs),
          validationAttempt: attemptNumber,
          attemptCount: 0,
          lockedAt: null,
        },
      });
      return;
    }

    if (job.step === "repair") {
      if (!job.plannerPlan || !job.draftPaper || !job.repairAttempts) throw new Error("Job reached repair with missing state");
      const plan: PlannerPlan = JSON.parse(job.plannerPlan);
      const draft: GeneratedPaperShape = JSON.parse(job.draftPaper);
      const attemptLogs: RepairAttemptLog[] = JSON.parse(job.repairAttempts);
      const violations = attemptLogs[attemptLogs.length - 1]?.violations ?? [];

      const repaired = await withRetry(() => runRepairAgent(genAI, config, plan, draft, violations), "Repair Agent", 1);

      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: {
          step: "validate",
          draftPaper: JSON.stringify(repaired),
          attemptCount: 0,
          lockedAt: null,
        },
      });
      return;
    }
  } catch (err) {
    if (err instanceof DailyQuotaExhaustedError) {
      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error: err.message,
          quotaRefunded: true,
          retryWorthwhile: false,
          lockedAt: null,
        },
      });
      await refundQuota(job.userId, "PAPER_GENERATION");
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    const newAttemptCount = job.attemptCount + 1;
    if (newAttemptCount >= MAX_STEP_ATTEMPTS) {
      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: { status: "failed", error: message, retryWorthwhile: true, lockedAt: null, attemptCount: newAttemptCount },
      });
      await refundQuota(job.userId, "PAPER_GENERATION");
      return;
    }
    // Stay on the same step; leave status "running" with an incremented
    // attemptCount and a fresh updatedAt so the backoff check above spaces
    // out the next retry — the row itself is the retry queue, no separate
    // in-memory queue to lose on a cold start.
    await prisma.paperGenerationJob.update({
      where: { id: jobId },
      data: { error: message, attemptCount: newAttemptCount, lockedAt: null },
    });
  }
}

/**
 * Safety net for the daily cron (see /api/cron/sweep-paper-jobs). The
 * common path is a poll from someone actually watching the progress UI —
 * this exists for what a poll wouldn't catch: the user closed the tab, or
 * the browser dropped one and never retried. Finds ONE job that's actually
 * due (queued outright, or "running" with a lock stale enough to mean its
 * worker died) and advances it a single step. Mirrors
 * processOneDueJob()/sweep-evaluations' shape deliberately — same pattern,
 * same reason: Hobby-plan crons only run once a day, so this is a coarse
 * backstop, not the primary driver.
 */
export async function processOneDuePaperJob(): Promise<boolean> {
  const staleCutoff = new Date(Date.now() - LOCK_STALE_MS);
  const due = await prisma.paperGenerationJob.findFirst({
    where: {
      OR: [
        { status: "queued" },
        { status: "running", OR: [{ lockedAt: null }, { lockedAt: { lt: staleCutoff } }] },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!due) return false;
  await processJobStep(due.id);
  return true;
}

/** Read-only view for the poller — never mutates. */
export async function getJobView(jobId: string, userId: string) {
  const job = await prisma.paperGenerationJob.findFirst({ where: { id: jobId, userId } });
  if (!job) return null;
  return {
    id: job.id,
    status: job.status as JobStatus,
    step: job.step as JobStep,
    agentStates: JSON.parse(job.agentStates) as AgentStates,
    repairAttempts: job.repairAttempts ? (JSON.parse(job.repairAttempts) as RepairAttemptLog[]) : [],
    error: job.error,
    quotaRefunded: job.quotaRefunded,
    retryWorthwhile: job.retryWorthwhile,
    paper: job.finalPaper ? JSON.parse(job.finalPaper) : null,
    savedPaperId: job.savedPaperId,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
