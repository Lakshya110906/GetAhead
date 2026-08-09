import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { DAILY_QUOTA_PATTERN, PER_MINUTE_QUOTA_PATTERN } from "@/lib/geminiErrorPatterns";

// Ground truth for "how many requests does one operation actually cost" —
// before this, the only way to answer that was reading code and hoping the
// retry/loop bounds were understood correctly. One row per real
// model.generateContent() call (or per replayed fixture read, marked as
// such), so the actual count for any operation is a query, not a guess.

export type GeminiOperation =
  | "paper_planner"
  | "paper_generator"
  | "paper_reviewer"
  | "paper_repair"
  | "eval_extraction"
  | "eval_grade_question"
  | "tutor_chat";

export type GeminiErrorType = "daily_quota" | "rate_limit" | "validation_failed" | "other";

export interface CallLogEntry {
  operation: GeminiOperation;
  model: string;
  agent?: string; // e.g. "Q3" for a specific question's grading call
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  isRetry?: boolean;
  attemptNumber?: number;
  success: boolean;
  errorType?: GeminiErrorType;
  durationMs?: number;
  replayed?: boolean;
  correlationId?: string; // jobId / evaluationId
  userId?: string;
}

/**
 * Fire-and-forget persistence — logging a call must never be the reason the
 * call itself fails or slows down. Always also emits a structured console
 * line (via logger) so it shows up in Vercel function logs immediately,
 * independent of whether the DB write lands.
 */
export function logGeminiCall(entry: CallLogEntry): void {
  logger.info(`[gemini-call] ${entry.operation}${entry.agent ? `/${entry.agent}` : ""} — ${entry.success ? "ok" : `failed (${entry.errorType || "other"})`}${entry.replayed ? " [replayed]" : ""}`, {
    operation: entry.operation,
    model: entry.model,
    agent: entry.agent,
    totalTokens: entry.totalTokens,
    isRetry: entry.isRetry,
    attemptNumber: entry.attemptNumber,
    success: entry.success,
    errorType: entry.errorType,
    durationMs: entry.durationMs,
    replayed: entry.replayed,
    correlationId: entry.correlationId,
  });

  prisma.geminiCallLog
    .create({
      data: {
        operation: entry.operation,
        model: entry.model,
        agent: entry.agent,
        promptTokens: entry.promptTokens,
        completionTokens: entry.completionTokens,
        totalTokens: entry.totalTokens,
        isRetry: entry.isRetry ?? false,
        attemptNumber: entry.attemptNumber ?? 1,
        success: entry.success,
        errorType: entry.errorType,
        durationMs: entry.durationMs,
        replayed: entry.replayed ?? false,
        correlationId: entry.correlationId,
        userId: entry.userId,
      },
    })
    .catch((err) => {
      logger.error("Failed to persist GeminiCallLog row", { message: err instanceof Error ? err.message : String(err) });
    });
}

/**
 * Wraps a single Gemini call: times it, classifies the error (daily quota vs
 * rate limit vs other) if it throws, logs exactly once, and rethrows so
 * normal error handling upstream is unaffected. This is the one place every
 * call site should go through, so the log is never missed or duplicated.
 */
export async function timedGeminiCall<T>(
  meta: Omit<CallLogEntry, "success" | "durationMs" | "totalTokens" | "promptTokens" | "completionTokens">,
  fn: () => Promise<{ value: T; promptTokens?: number; completionTokens?: number; totalTokens?: number }>
): Promise<T> {
  const start = Date.now();
  try {
    const { value, promptTokens, completionTokens, totalTokens } = await fn();
    logGeminiCall({ ...meta, success: true, durationMs: Date.now() - start, promptTokens, completionTokens, totalTokens });
    return value;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Same patterns question-agents.ts uses to decide whether to retry — the
    // logged errorType and the actual retry decision must never disagree.
    const errorType: GeminiErrorType = DAILY_QUOTA_PATTERN.test(message)
      ? "daily_quota"
      : PER_MINUTE_QUOTA_PATTERN.test(message)
      ? "rate_limit"
      : "other";
    logGeminiCall({ ...meta, success: false, durationMs: Date.now() - start, errorType });
    throw err;
  }
}
