// Structured logging so one failed evaluation can be traced end to end by
// grepping a single jobId across every stage — enqueue, claim, download,
// transcribe, grade, persist — instead of correlating loose console lines.
// Every line is a single JSON object on stdout/stderr; Vercel's log
// pipeline (and Sentry breadcrumbs, see sentry.*.config.ts) both ingest
// structured console output natively, so no separate log shipper is needed.

export type LogStage =
  | "enqueue"
  | "claim"
  | "download"
  | "transcribe"
  | "grade"
  | "persist"
  | "worker-trigger"
  | "sweep";

export interface LogContext {
  jobId?: string;
  stage?: LogStage;
  userId?: string;
  [key: string]: unknown;
}

function write(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const line = {
    time: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
