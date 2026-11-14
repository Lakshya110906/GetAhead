import { kv } from "@vercel/kv";
import { prisma } from "@/lib/prisma";

// Fixed-window counter backed by a real key-value store (not in-memory —
// an in-memory counter is per-serverless-instance and resets on every cold
// start, which is not a rate limit). Falls back to a database-backed
// counter (below) if KV isn't configured or unreachable, logged loudly so
// that's visible rather than silent.
let warnedMissingKv = false;
function kvConfigured(): boolean {
  const configured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (!configured && !warnedMissingKv) {
    warnedMissingKv = true;
    console.warn("[rateLimit] KV_REST_API_URL/KV_REST_API_TOKEN are not set — using the database-backed fallback limiter.");
  }
  return configured;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // epoch ms
  // Set when no limiter could be reached at all and the request was refused
  // for that reason, not because the caller went over the limit.
  unavailable?: boolean;
}

// Confirmed live: neither KV_REST_API_URL nor KV_REST_API_TOKEN has ever
// been set in any Vercel environment, so this database counter is the
// limiter actually in use everywhere (proxy.ts on every auth endpoint and
// evaluation-enqueue, signup, forgot-password, the tutor).
//
// It used to read the row and then write it, so concurrent requests all saw
// the same count and a burst could run well past `limit`; and any database
// error let the request through. Now a request inside a live window is an
// atomic increment read back in the same transaction, so each request sees
// its own position in the window. Starting a new window is a conditional reset, retried
// once if another request got there first. Errors refuse the request.
async function dbFallbackRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = new Date();
  const freshResetAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      // One transaction: the UPDATE row-locks until commit, so the read
      // after it sees exactly this request's count, not a later racer's.
      const bumped = await prisma.$transaction(async (tx) => {
        const updated = await tx.rateLimit.updateMany({
          where: { key, resetAt: { gte: now } },
          data: { count: { increment: 1 } },
        });
        return updated.count === 1 ? tx.rateLimit.findUnique({ where: { key } }) : null;
      });
      if (bumped) {
        const count = bumped.count;
        return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit, resetAt: bumped.resetAt.getTime() };
      }

      // No live window. Restart an expired one, or create the first one.
      const restarted = await prisma.rateLimit.updateMany({
        where: { key, resetAt: { lt: now } },
        data: { count: 1, resetAt: freshResetAt },
      });
      if (restarted.count === 1) {
        return { allowed: true, remaining: limit - 1, limit, resetAt: freshResetAt.getTime() };
      }
      try {
        await prisma.rateLimit.create({ data: { key, count: 1, resetAt: freshResetAt } });
        return { allowed: true, remaining: limit - 1, limit, resetAt: freshResetAt.getTime() };
      } catch (err) {
        // Another request created or restarted the window between our
        // checks: go round once more and count against it.
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
    }
    throw new Error(`rate limit window for ${key} kept changing under contention`);
  } catch (err) {
    console.error("[rateLimit] database limiter error, refusing the request:", err);
    return { allowed: false, remaining: 0, limit, resetAt: Date.now() + windowSeconds * 1000, unavailable: true };
  }
}

/**
 * Allows up to `limit` requests per `windowSeconds` for the given key.
 * Uses KV when configured (one INCR + one EXPIRE — two round trips worst
 * case, one in the common case), and the database counter above otherwise
 * or when KV errors. If neither can be reached the request is refused with
 * `unavailable: true`: these limits guard sign-in and paid model calls, and
 * the routes behind them need the database anyway.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  if (!kvConfigured()) {
    return dbFallbackRateLimit(key, limit, windowSeconds);
  }

  try {
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    const count = await kv.incr(windowKey);
    if (count === 1) {
      await kv.expire(windowKey, windowSeconds);
    }
    const resetAt = (Math.floor(Date.now() / (windowSeconds * 1000)) + 1) * windowSeconds * 1000;
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit, resetAt };
  } catch (err) {
    console.error("[rateLimit] KV error, using the database limiter instead:", err);
    return dbFallbackRateLimit(key, limit, windowSeconds);
  }
}

/**
 * Simple boolean wrapper around rateLimit() for route-level callers that
 * want an endpoint-specific limit layered on top of proxy.ts's general
 * per-endpoint-class one (e.g. signup's stricter per-hour cap vs the
 * general auth-endpoint per-minute one) without needing the full
 * RateLimitResult shape.
 */
export async function checkRateLimit(key: string, maxCount: number, windowMs: number): Promise<boolean> {
  const result = await rateLimit(key, maxCount, Math.round(windowMs / 1000));
  return result.allowed;
}
