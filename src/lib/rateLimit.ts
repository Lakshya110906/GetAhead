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
}

// Confirmed live: neither KV_REST_API_URL nor KV_REST_API_TOKEN has ever
// been set in any Vercel environment, which means every call site of this
// module — proxy.ts's edge rate limiting on every auth endpoint plus
// evaluation-enqueue — has been silently failing open since the day it
// shipped. The privacy policy's "Rate limiting on all authentication
// endpoints" claim has not been true. This fallback uses the same
// RateLimit table already proven out by the per-route checks in
// signup/forgot-password, so real enforcement exists with zero new
// infrastructure to provision. Not as fast as KV under heavy concurrency
// (read-then-conditional-write, not an atomic INCR — a narrow race can let
// a burst exceed `limit` by a handful of requests under true concurrent
// load), but that's a precision tradeoff, not the difference between
// having a limit and not having one at all.
async function dbFallbackRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = new Date();
  const resetAtDate = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });
    if (!existing || existing.resetAt < now) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt: resetAtDate },
        update: { count: 1, resetAt: resetAtDate },
      });
      return { allowed: true, remaining: limit - 1, limit, resetAt: resetAtDate.getTime() };
    }
    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, limit, resetAt: existing.resetAt.getTime() };
    }
    await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return { allowed: true, remaining: Math.max(0, limit - existing.count - 1), limit, resetAt: existing.resetAt.getTime() };
  } catch (err) {
    console.error("[rateLimit] database fallback error, failing open:", err);
    return { allowed: true, remaining: limit, limit, resetAt: Date.now() + windowSeconds * 1000 };
  }
}

/**
 * Allows up to `limit` requests per `windowSeconds` for the given key.
 * Uses KV when configured (one INCR + one EXPIRE — two round trips worst
 * case, one in the common case); falls back to the database counter above
 * otherwise. Either way this is real enforcement, not a no-op.
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
    console.error("[rateLimit] KV error, failing open:", err);
    return { allowed: true, remaining: limit, limit, resetAt: Date.now() + windowSeconds * 1000 };
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
