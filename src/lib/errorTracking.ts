import * as Sentry from "@sentry/nextjs";

// Fields that must never leave this process in an error report — student
// answer content, transcribed text, raw model output, and anything
// credential-shaped. This list is intentionally broad (matched by key name,
// case-insensitively, anywhere in a nested object) rather than an allowlist,
// because a new field added to a payload later should be excluded by
// default, not included by default.
const SENSITIVE_KEY_PATTERN =
  /password|token|secret|authorization|cookie|ocrtext|extractedtext|airesponse|rawmodelresponse|answer|studentanswer|aifeedback|marksbreakdown|email/i;

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : scrubValue(val, depth + 1);
    }
    return out;
  }
  return value;
}

interface ScrubbableEvent {
  request?: { url?: string; method?: string };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  breadcrumbs?: Array<{ data?: Record<string, unknown> }>;
}

/**
 * Sentry `beforeSend`/`beforeSendTransaction` hook: strips request bodies
 * and headers entirely (they can contain answer-sheet content or auth
 * cookies), and scrubs any sensitive-looking key from extra/context data.
 * Shared between client, server, and edge init so the rule lives in one
 * place instead of three configs drifting apart.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    event.request = { url: event.request.url, method: event.request.method };
  }
  if (event.extra) {
    event.extra = scrubValue(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = scrubValue(event.contexts) as Record<string, unknown>;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      data: b.data ? (scrubValue(b.data) as Record<string, unknown>) : b.data,
    }));
  }
  return event;
}

/**
 * App-wide entry point for reporting a caught error, with a scrubbed
 * context object (jobId/stage/etc — never raw file bytes or model text).
 * No-ops safely if Sentry was never initialized (no SENTRY_DSN configured),
 * matching this codebase's pattern of every optional integration failing
 * open rather than throwing when unconfigured.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  try {
    Sentry.captureException(error, { extra: context ? (scrubValue(context) as Record<string, unknown>) : undefined });
  } catch {
    // Sentry not initialized or SDK call failed — the console.error the
    // caller already did is the fallback record of this error.
  }
}
