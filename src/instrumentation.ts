import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/errorTracking";

// Release tag: the deployed commit SHA on Vercel, or "dev" locally — lets
// Sentry group/attribute errors to the exact prompt/rubric/model version
// that produced them, same idea as the accuracy harness's PROMPT_VERSION.
const release = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // no-op without a configured DSN, same fail-open pattern as rateLimit.ts

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      release,
      tracesSampleRate: 0.1,
      beforeSend: scrubEvent,
      beforeSendTransaction: scrubEvent,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      release,
      tracesSampleRate: 0.1,
      beforeSend: scrubEvent,
      beforeSendTransaction: scrubEvent,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
