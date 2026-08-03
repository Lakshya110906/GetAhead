import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/errorTracking";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "dev",
    tracesSampleRate: 0.1,
    // No session replay / no automatic breadcrumb capture of DOM input
    // values — an answer-sheet upload page is exactly where "record what
    // the user typed" defaults would leak student answers into a
    // third-party error report.
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
