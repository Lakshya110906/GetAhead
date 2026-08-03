import { kv } from "@vercel/kv";

// Fixed-window counter backed by a real key-value store (not in-memory —
// an in-memory counter is per-serverless-instance and resets on every cold
// start, which is not a rate limit). Fails open (allow) if KV isn't
// configured or unreachable, logged loudly so that's visible rather than
// silent.
let warnedMissingKv = false;
function kvConfigured(): boolean {
  const configured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (!configured && !warnedMissingKv) {
    warnedMissingKv = true;
    console.warn("[rateLimit] KV_REST_API_URL/KV_REST_API_TOKEN are not set — rate limiting is disabled (failing open).");
  }
  return configured;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // epoch ms
}

/**
 * Allows up to `limit` requests per `windowSeconds` for the given key.
 * One INCR + one EXPIRE (only set on the first hit in a window) — two KV
 * round trips worst case, one in the common case.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  if (!kvConfigured()) {
    return { allowed: true, remaining: limit, limit, resetAt: Date.now() + windowSeconds * 1000 };
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
