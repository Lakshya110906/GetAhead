import { prisma } from "@/lib/prisma";

// Section 4: quota state must be visible before it's a surprise, and an
// operation that can't possibly complete should never be allowed to start
// and fail partway. This module is the single source of truth for "how much
// Gemini quota is left today, per model" — built on GeminiCallLog (every
// real call, whether it succeeded or failed, is already logged there).

export interface ModelQuotaLimit {
  rpd: number;
  rpm: number;
  // Whether rpd/rpm below are directly confirmed from a live 429 response
  // this project has actually received, vs. Google's published free-tier
  // default applied as a best-available estimate. Surfaced in the UI so
  // "20" doesn't read as more certain than it is.
  confirmed: boolean;
}

// gemini-2.5-flash's RPD=20 is the one number confirmed live this session
// (from an actual 429 response body: quotaId
// GenerateRequestsPerDayPerProjectPerModel-FreeTier, quotaValue "20").
// gemini-2.0-flash and gemini-2.0-flash-lite were confirmed EXHAUSTED
// (also hit PerDay) on the same day this project's gemini-2.5-flash quota
// was exhausted, without ever having been called before that — meaning the
// real constraint on this project may be a shared/aggregate ceiling below
// what the per-model RPD numbers below suggest, not truly independent
// per-model buckets. The numbers below are per Google's published free-tier
// defaults, used as the best available per-model estimate; the actual
// binding constraint could be lower. Flagged, not hidden.
export const MODEL_QUOTA_LIMITS: Record<string, ModelQuotaLimit> = {
  "gemini-2.5-flash": { rpd: 20, rpm: 10, confirmed: true },
  "gemini-2.0-flash": { rpd: 20, rpm: 15, confirmed: false },
  "gemini-2.0-flash-lite": { rpd: 20, rpm: 30, confirmed: false },
};

const DEFAULT_LIMIT: ModelQuotaLimit = { rpd: 20, rpm: 10, confirmed: false };

export function getModelLimit(model: string): ModelQuotaLimit {
  return MODEL_QUOTA_LIMITS[model] ?? DEFAULT_LIMIT;
}

/**
 * Gemini's actual daily quota reset is midnight Pacific Time (Google's
 * documented policy for the free tier — the API itself does not return a
 * reset timestamp in 429 response bodies, confirmed by inspecting real
 * responses this session, so this is the best available answer, not a
 * parsed value). Computed relative to now so it's always the NEXT
 * upcoming Pacific midnight, not a static string.
 */
export function nextPacificMidnightUtc(now: Date = new Date()): Date {
  // Pacific is UTC-7 (PDT) or UTC-8 (PST). Using -7 (PDT, the summer/most
  // of the year offset) as the approximation — being off by an hour around
  // the DST boundary is an acceptable error for "roughly when it resets",
  // not a billing-accurate calculation.
  const PACIFIC_OFFSET_HOURS = 7;
  const utcMidnightToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let pacificMidnightUtc = new Date(utcMidnightToday.getTime() + PACIFIC_OFFSET_HOURS * 60 * 60 * 1000);
  if (pacificMidnightUtc <= now) {
    pacificMidnightUtc = new Date(pacificMidnightUtc.getTime() + 24 * 60 * 60 * 1000);
  }
  return pacificMidnightUtc;
}

// The window getModelUsageToday() actually COUNTS against must be the same
// window nextPacificMidnightUtc() reports as resetting — derived from that
// same function rather than reimplementing the boundary math, so the two
// can never drift apart again. Previously this counted the UTC calendar day
// instead (00:00-24:00 UTC), which is misaligned from the real Pacific
// reset by up to 7 hours: a call made between UTC 00:00 and 07:00 was
// excluded from "today"'s count even though it was still part of the
// CURRENTLY ACTIVE Pacific quota window (which started the previous UTC
// calendar day, at that same day's UTC 07:00). Confirmed live: this app
// reported "0 used, 20 remaining" for gemini-2.5-flash, then a real
// generation immediately hit a 429 daily_quota error on its 4th call —
// real usage from earlier in the SAME still-active Pacific window had
// already exhausted the quota, invisibly to the old count.
function currentPacificQuotaWindowUtc(now: Date = new Date()): { start: Date; end: Date } {
  const end = nextPacificMidnightUtc(now);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

export interface ModelQuotaUsage {
  model: string;
  used: number;
  limit: number;
  remaining: number;
  fractionUsed: number;
  confirmed: boolean;
  resetsAt: string;
  level: "ok" | "warn" | "block";
}

const WARN_FRACTION = 0.8;
const BLOCK_FRACTION = 0.95;

function levelFor(fractionUsed: number): "ok" | "warn" | "block" {
  if (fractionUsed >= BLOCK_FRACTION) return "block";
  if (fractionUsed >= WARN_FRACTION) return "warn";
  return "ok";
}

/**
 * Today's real (non-replayed) request count for one model, from
 * GeminiCallLog. Counts every attempt that actually reached the API and
 * consumed a request slot — successes, and failures for reasons OTHER than
 * being rejected by rate/quota limiting (a 429 for daily_quota or
 * rate_limit means Google rejected the request before it counted against
 * anything; counting those again would double-count the rejection, not
 * measure real usage).
 *
 * `NOT: { errorType: { in: [...] } }` on its own is a real bug, not just a
 * style choice: SQL's three-valued logic makes `NULL NOT IN (...)`
 * evaluate to NULL, not TRUE, so every successful row (errorType IS NULL —
 * the overwhelming majority of rows) was silently excluded by that filter,
 * not just the daily_quota/rate_limit ones it was meant to exclude.
 * Confirmed directly against the real table: 18 successful calls existed
 * in today's window, and the old query counted 0 of them. That's why this
 * app could report "0 used, 20 remaining" moments before a live generation
 * immediately hit a real 429 on its 4th call — the quota gate was reading
 * a number that was wrong for this table's entire lifetime, not stale for
 * a few hours. errorType: null rows must be counted explicitly.
 */
export async function getModelUsageToday(model: string): Promise<ModelQuotaUsage> {
  const { start, end } = currentPacificQuotaWindowUtc();
  const used = await prisma.geminiCallLog.count({
    where: {
      model,
      replayed: false,
      createdAt: { gte: start, lt: end },
      OR: [{ errorType: null }, { NOT: { errorType: { in: ["daily_quota", "rate_limit"] } } }],
    },
  });
  const limit = getModelLimit(model);
  const fractionUsed = limit.rpd > 0 ? used / limit.rpd : 0;
  return {
    model,
    used,
    limit: limit.rpd,
    remaining: Math.max(0, limit.rpd - used),
    fractionUsed,
    confirmed: limit.confirmed,
    resetsAt: nextPacificMidnightUtc().toISOString(),
    level: levelFor(fractionUsed),
  };
}

/** Today's usage across every model this project actually calls. */
export async function getAllModelUsageToday(): Promise<ModelQuotaUsage[]> {
  const models = Object.keys(MODEL_QUOTA_LIMITS);
  return Promise.all(models.map((m) => getModelUsageToday(m)));
}

export class QuotaHeadroomError extends Error {
  constructor(public readonly usage: ModelQuotaUsage, public readonly requestsNeeded: number) {
    super(
      `Not enough ${usage.model} quota left today to safely start this operation: ` +
        `${usage.remaining} of ${usage.limit} daily requests remain, this operation needs up to ${requestsNeeded}. ` +
        `Resets at ${usage.resetsAt} (midnight Pacific Time). Try again after it resets, or with a smaller operation.`
    );
    this.name = "QuotaHeadroomError";
  }
}

// CONFIRMED live (via `vercel env pull` + hash comparison, this session):
// Preview deployments share the exact same GOOGLE_GENERATIVE_AI_API_KEY as
// Production — meaning every preview-branch test burns the same 20-request
// daily ceiling real users depend on. Proper fix is a second, genuinely
// separate Gemini API key for Preview (needs the Google AI Studio console —
// not something this code can provision on its own); until that exists,
// Preview is blocked from making real calls against the shared pool at all,
// rather than silently competing with production traffic for it. Preview
// should be testing against the record/replay fixtures (fixtures/gemini-cache,
// see geminiFixtureCache.ts) anyway, which cost nothing and need no key.
export class PreviewEnvironmentBlockedError extends Error {
  constructor(requestsNeeded: number) {
    super(
      `This preview deployment shares Gemini's daily quota with production (confirmed: same API key). ` +
        `Preview is blocked from making real Gemini calls (this operation would have needed ${requestsNeeded}) ` +
        `to avoid burning quota production users depend on. Set ALLOW_PREVIEW_GEMINI_CALLS=true to override for a ` +
        `deliberate one-off live test, or use replayed fixtures instead.`
    );
    this.name = "PreviewEnvironmentBlockedError";
  }
}

function isUnseparatedPreview(): boolean {
  return process.env.VERCEL_ENV === "preview" && process.env.ALLOW_PREVIEW_GEMINI_CALLS !== "true";
}

/**
 * Pre-flight gate: call before starting an operation that will make
 * `requestsNeeded` Gemini requests against `model`. Throws QuotaHeadroomError
 * — with the specific remaining/needed/reset numbers, not a generic
 * "quota exceeded" — if today's usage is already past the block threshold
 * OR there isn't enough remaining headroom for this specific operation,
 * whichever is the tighter constraint. Never lets an operation start that's
 * already known to be unable to finish. Also refuses outright on an
 * unseparated Preview deployment (see PreviewEnvironmentBlockedError) —
 * checked first, since that's categorical, not a matter of remaining count.
 */
export async function assertQuotaHeadroom(model: string, requestsNeeded: number): Promise<ModelQuotaUsage> {
  if (isUnseparatedPreview()) {
    throw new PreviewEnvironmentBlockedError(requestsNeeded);
  }
  const usage = await getModelUsageToday(model);
  if (usage.level === "block" || usage.remaining < requestsNeeded) {
    throw new QuotaHeadroomError(usage, requestsNeeded);
  }
  return usage;
}
