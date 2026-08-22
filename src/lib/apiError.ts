import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/errorTracking";

// Central place every route's catch block reports through — this is the fix
// for a real, live incident: POST /api/papers was returning "Failed to start
// generation" for a platform-level timeout with zero server-side logging of
// what actually happened, which took several rounds to diagnose because
// nothing recorded which line threw, what the real message was, or even that
// a request had failed at all beyond a generic string reaching the browser.
//
// Every call site gets: (1) a stable, greppable code shown to the user
// alongside a friendly message, so a bug report says "GEN_JOB_CREATE_FAILED"
// instead of "it broke"; (2) a full server-side log with stack trace and
// request context; (3) a durable, queryable row in ErrorLog — a failure
// leaves a trace independent of whether anyone was tailing logs at the time;
// (4) in development, the real error message/stack reaches the client
// response directly, so local debugging doesn't need the log at all.

export const ErrorCodes = {
  GEN_JOB_CREATE_FAILED: "Something went wrong while starting your paper generation job.",
  GEN_STEP_FAILED: "Paper generation hit a problem partway through and couldn't continue.",
  GEN_POLL_FAILED: "Couldn't check on your generation job's progress.",
  GEN_CANCEL_FAILED: "Couldn't cancel this generation job.",
  EVAL_ENQUEUE_FAILED: "Something went wrong while queuing your answer sheet for evaluation.",
  EVAL_STATUS_FAILED: "Couldn't check on your evaluation's status.",
  EVAL_WORKER_FAILED: "Grading this answer sheet failed partway through.",
  REPORT_FETCH_FAILED: "Couldn't load this report.",
  TUTOR_STREAM_FAILED: "The AI tutor couldn't respond that time.",
  TUTOR_RATE_LIMITED: "AI rate limit reached — please wait a moment and try again.",
  TUTOR_TIMEOUT: "The AI tutor took too long to respond.",
  UPLOAD_AUTH_FAILED: "Couldn't authorize this file upload.",
  DB_MIGRATION_DRIFT: "A database schema problem is blocking this request.",
  TICKET_FETCH_FAILED: "Couldn't load support tickets.",
  TICKET_ACTION_FAILED: "Couldn't complete that action on this ticket.",
  TICKET_CREATE_FAILED: "Couldn't submit your support ticket.",
  AUTH_REQUEST_FAILED: "Something went wrong processing that request.",
  ACCOUNT_DELETE_FAILED: "Couldn't delete your account due to a server error. Try again in a moment.",
  PROFILE_FETCH_FAILED: "Couldn't load your profile.",
  PROFILE_UPDATE_FAILED: "Failed to update profile settings.",
  PASSWORD_CHANGE_FAILED: "Couldn't update your password due to a server error. Try again in a moment.",
  PREFERENCES_FETCH_FAILED: "Couldn't load your notification preferences.",
  PREFERENCES_UPDATE_FAILED: "Failed to save notification preferences.",
  ADMIN_ACTION_FAILED: "Couldn't complete that admin action.",
  QUESTION_PAPER_FETCH_FAILED: "Couldn't load this question paper.",
  QUESTION_PAPER_DELETE_FAILED: "Couldn't delete this question paper.",
  QUESTION_PAPER_UPDATE_FAILED: "Couldn't update this question paper.",
  UNKNOWN: "Something went wrong on our end.",
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

interface ReportOptions {
  code: ErrorCode;
  error: unknown;
  route: string;
  stage?: string;
  userId?: string;
  status?: number;
  extra?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * Logs the real error (console + Sentry + a durable ErrorLog row) and
 * returns a NextResponse the route can hand straight back — code + friendly
 * message always, the real message and stack only outside production.
 */
export async function reportApiError(opts: ReportOptions): Promise<NextResponse> {
  const { code, error, route, stage, userId, status = 500, extra } = opts;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const timestamp = new Date().toISOString();

  // 1. Full server-side log — every catch that reports through here logs
  // the real error, with enough context to find the request again.
  logger.error(`[${code}] ${route}${stage ? ` (${stage})` : ""}: ${message}`, {
    code,
    route,
    userId,
    stack,
    ...(stage ? { errorStage: stage } : {}),
    ...extra,
  });

  // 2. Sentry, scrubbed of sensitive fields (existing hook in errorTracking.ts).
  captureException(error, { code, route, stage, userId, ...extra });

  // 3. Durable, queryable trace — independent of whether anyone was
  // watching logs when it happened. Best-effort: a failure to WRITE the
  // error log must never mask the original error or crash the request.
  try {
    await prisma.errorLog.create({
      data: {
        type: code,
        message: `${route}${stage ? ` (${stage})` : ""}: ${message}`,
        stack: stack || null,
        path: route,
      },
    });
  } catch (logErr) {
    logger.error(`Failed to persist ErrorLog row for ${code}`, {
      route,
      originalError: message,
      logWriteError: logErr instanceof Error ? logErr.message : String(logErr),
    });
  }

  // 4. The actual response — code + friendly message always (this is what
  // "Failed to start generation" should have looked like from the start);
  // real message/stack added outside production so local/staging debugging
  // never needs to go dig through logs for something already in view.
  return NextResponse.json(
    {
      error: ErrorCodes[code],
      code,
      timestamp,
      ...(isDev ? { devMessage: message, devStack: stack } : {}),
    },
    { status }
  );
}
