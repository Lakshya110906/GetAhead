import { prisma } from "@/lib/prisma";
import { refundQuota } from "@/lib/quota";
import {
  getGenAI,
  shouldUseMockQuestionPaper,
  getMockQuestionPaper,
  runPlannerAgent,
  runGeneratorAgent,
  runReviewerAgent,
  runRepairAgent,
  correctPlanMarks,
  filterPlanToRequestedTypes,
  conformDraftToPlan,
  finalizePaper,
  buildValidationContext,
  withRetry,
  DailyQuotaExhaustedError,
  GeminiAuthError,
  GeminiInvalidArgumentError,
  type PaperConfig,
  type RepairAttemptLog,
} from "@/lib/question-agents";
import { validatePaper, assignSectionLetters } from "@/lib/paperValidation";
import { parseCustomInstructions } from "@/lib/paperConstraintParser";
import { buildUserFacingValidationMessage } from "@/lib/paperUserMessages";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/errorTracking";
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

// Every write in processJobStep() is a plain update-by-id with no status
// guard in the WHERE clause. That's fine for writes that happen right after
// the terminal-status check at the top of the function, but a real Gemini
// call (several seconds) sits between reading `job` and several of the
// writes below — long enough for DELETE /api/papers/[id] (cancel) to land
// in between. Without this check, the write after an in-flight call
// completes would silently resurrect an already-cancelled job instead of
// leaving it cancelled, wasting further quota on a job the user explicitly
// stopped. Called after each of the four Gemini calls, before persisting
// their result.
async function isCancelled(jobId: string): Promise<boolean> {
  const current = await prisma.paperGenerationJob.findUnique({ where: { id: jobId }, select: { status: true } });
  return !current || current.status === "cancelled";
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
    if (shouldUseMockQuestionPaper()) {
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
      // A Gemini call can take several real seconds — long enough for a
      // user to cancel while this was in flight. Every write in this
      // function is a plain update-by-id with no status guard, so writing
      // a "generator" step transition here without re-checking would
      // silently resurrect an already-cancelled job. Bail before persisting
      // anything if that happened.
      if (await isCancelled(jobId)) return;
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

      const rawDraft = await withRetry(() => runGeneratorAgent(genAI, config, plan), "Generator Agent", 1);
      if (await isCancelled(jobId)) return;
      const draft = conformDraftToPlan(rawDraft, plan, config.questionTypes);
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

      const rawReviewed = await withRetry(() => runReviewerAgent(genAI, config, draft), "Reviewer Agent", 1);
      if (await isCancelled(jobId)) return;
      // Reviewer's own prompt also says not to change question count/marks —
      // same non-enforcement risk as the generator step, so the same
      // deterministic trim applies here too. A no-op (draft already
      // conformed) unless the reviewer itself introduced drift.
      const reviewed = conformDraftToPlan(rawReviewed, plan, config.questionTypes);
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
      const previousAttempt = attemptLogs[attemptLogs.length - 1];
      // Historical note: the topic check used to contribute a "most
      // questions (X/Y)" violation whose embedded count moved attempt to
      // attempt even when failing for the same underlying reason — the
      // identical-consecutive-failure abort below never fired, and a job
      // burned a full 3rd repair+validate cycle it had no chance of
      // passing (confirmed live: topic "geometry" produced "11/12", then
      // "8/12", then "12/12" across three attempts). The topic check is now
      // a non-blocking warning (see paperValidation.ts) and can no longer
      // produce a violations entry at all, so this specific regex is dead
      // for that case — left in place since the normalize-then-compare
      // pattern is general (applies to whatever violation kinds exist) and
      // a future violation type with its own volatile count would need the
      // same treatment.
      const normalizeViolation = (v: string) => v.replace(/^most questions \(\d+\/\d+\)/, "most questions (N/M)");
      const violationsKey = (v: string[]) => [...v].map(normalizeViolation).sort().join("|");
      const outputChanged = !previousAttempt || violationsKey(previousAttempt.violations) !== violationsKey(validation.violations);
      attemptLogs.push({ attempt: attemptNumber, violations: validation.violations, outputChanged });
      logger.info(`Paper generation job ${jobId} validate attempt ${attemptNumber}: ${validation.valid ? "PASSED" : "FAILED"}${previousAttempt ? `, outputChanged=${outputChanged}` : ""}`, {
        route: "processJobStep",
        jobId,
        step: "validate",
        attempt: attemptNumber,
        outputChanged,
      });

      if (validation.valid) {
        const finalPaper = finalizePaper(candidate, config.totalMarks);
        finalPaper.repairAttempts = attemptLogs;
        if (validation.warnings.length > 0) {
          // [TopicNotice] is a distinct prefix from finalizePaper()'s own
          // [Warning] (which the UI specifically labels "wasn't fully
          // AI-reviewed" — a different, incorrect claim for this case: the
          // paper WAS fully reviewed, the topic-match heuristic is just
          // uncertain). See generate-paper/page.tsx for the matching banner.
          finalPaper.reviewNotes = [...(finalPaper.reviewNotes ?? []), ...validation.warnings.map((w) => `[TopicNotice] ${w}`)];
        }
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

      // Two consecutive attempts with the IDENTICAL violation means the
      // repair step changed nothing that mattered — at temperature 0, an
      // unchanged violation fed back into an unchanged repair prompt
      // produces the same output again. A third attempt would not either;
      // aborting here instead of running one more repair+validate cycle is
      // the fix for a real, confirmed-live incident (topic "trignometry and
      // geometry": all 3 attempts failed with byte-identical violation
      // text, burning 5 calls to learn nothing after the 2nd would have
      // already shown it).
      if (previousAttempt && !outputChanged) {
        const message = `Paper failed validation: attempts ${previousAttempt.attempt} and ${attemptNumber} failed with the identical violation — repair had no effect, further attempts would not either: ${validation.violations.join("; ")}`;
        logger.warn(`Paper generation job ${jobId} aborting after identical consecutive validation failure`, {
          route: "processJobStep",
          jobId,
          step: "validate",
          attempt: attemptNumber,
          violations: validation.violations,
        });
        await prisma.paperGenerationJob.update({
          where: { id: jobId },
          data: {
            status: "failed",
            error: buildUserFacingValidationMessage(validation.violations),
            internalError: message,
            repairAttempts: JSON.stringify(attemptLogs),
            validationAttempt: attemptNumber,
            retryWorthwhile: false,
            lockedAt: null,
          },
        });
        await refundQuota(job.userId, "PAPER_GENERATION");
        return;
      }

      if (attemptNumber >= MAX_STEP_ATTEMPTS) {
        await prisma.paperGenerationJob.update({
          where: { id: jobId },
          data: {
            status: "failed",
            error: buildUserFacingValidationMessage(validation.violations),
            internalError: `Paper failed validation after ${attemptNumber} attempts: ${validation.violations.join("; ")}`,
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

      const rawRepaired = await withRetry(() => runRepairAgent(genAI, config, plan, draft, violations), "Repair Agent", 1);
      if (await isCancelled(jobId)) return;
      const repaired = conformDraftToPlan(rawRepaired, plan, config.questionTypes);

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
      logger.error(`Paper generation job ${jobId} hit daily quota exhaustion at step "${job.step}"`, {
        route: "processJobStep",
        jobId,
        userId: job.userId,
        step: job.step,
        message: err.message,
      });
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

    // Auth and invalid-argument errors are exactly as non-retryable as a
    // daily-quota exhaustion — retrying the identical request against a bad
    // API key or a malformed request fails identically every time. Without
    // this, they fell into the generic branch below and were requeued up to
    // MAX_STEP_ATTEMPTS times for no benefit (audited and fixed per Section
    // 4(e) — every retry site must agree on this classification).
    if (err instanceof GeminiAuthError || err instanceof GeminiInvalidArgumentError) {
      const message = err.message;
      logger.error(`Paper generation job ${jobId} hit a non-retryable Gemini error at step "${job.step}"`, {
        route: "processJobStep",
        jobId,
        userId: job.userId,
        step: job.step,
        message,
      });
      await prisma.paperGenerationJob.update({
        where: { id: jobId },
        data: { status: "failed", error: message, retryWorthwhile: false, lockedAt: null },
      });
      await refundQuota(job.userId, "PAPER_GENERATION");
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    const newAttemptCount = job.attemptCount + 1;
    logger.error(`Paper generation job ${jobId} failed at step "${job.step}" (attempt ${newAttemptCount}/${MAX_STEP_ATTEMPTS})`, {
      route: "processJobStep",
      jobId,
      userId: job.userId,
      step: job.step,
      attempt: newAttemptCount,
      message,
      stack: err instanceof Error ? err.stack : undefined,
    });
    captureException(err, { route: "processJobStep", jobId, step: job.step, attempt: newAttemptCount });

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
