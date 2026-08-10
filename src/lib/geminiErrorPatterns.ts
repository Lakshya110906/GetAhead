// Shared Gemini error classification patterns — the single source of truth
// used by both question-agents.ts (which decides whether to retry) and
// geminiCallLog.ts (which logs what kind of failure happened). Split into
// its own module to avoid a circular import between those two files.
//
// A 429 is NOT always transient. Gemini returns 429 for two completely
// different situations, distinguishable by the quotaId in the error body:
//   - GenerateRequestsPerMinute... — a short-lived rate limit, clears in
//     seconds, worth retrying.
//   - GenerateRequestsPerDay... — the daily quota is exhausted, will not
//     recover for the rest of the day, retrying is pointless.
// Both are matched on their SPECIFIC quotaId markers, never on the generic
// "exceeded your current quota" phrasing Google's error body uses for BOTH —
// that phrase alone can't tell them apart and defaulting either way on it
// risks either retrying something that can't succeed, or failing fast on
// something that would have cleared in seconds.
export const DAILY_QUOTA_PATTERN = /GenerateRequestsPerDay|PerDayPerProject|QuotaFailure.*[Dd]ay/i;
export const PER_MINUTE_QUOTA_PATTERN = /GenerateRequestsPerMinute|PerMinutePerProject/i;
export const AUTH_ERROR_PATTERN = /API key not valid|invalid.?api.?key|UNAUTHENTICATED|PERMISSION_DENIED|401 /i;
export const INVALID_ARGUMENT_PATTERN = /INVALID_ARGUMENT|400 Bad Request/i;
// Only messages that positively identify as a transient condition are
// retried. A bare, unqualified "quota"/"429" with neither a Day nor a Minute
// marker defaults to non-retryable — the point of this pattern is to never
// retry something a retry can't fix, so ambiguity resolves to the safe side.
export const RETRYABLE_ERROR_PATTERN = /GenerateRequestsPerMinute|PerMinutePerProject|503|overloaded|ECONNRESET|ETIMEDOUT|fetch failed|network.*(timeout|error)/i;

/**
 * Real Gemini 429 responses (confirmed live, multiple times this session)
 * include a `google.rpc.RetryInfo` entry in `errorDetails` with a
 * `retryDelay` field ("31s", "15.08s", etc.) — Google's own server-computed
 * answer to "how long until this specific request could succeed." Parsing
 * this instead of guessing a fixed/exponential backoff means the wait (and
 * anything told to the user) reflects what Google actually said, not an
 * assumption. Returns the raw string (e.g. "31s") and the parsed
 * milliseconds, or null if the error has no such field (e.g. a daily-quota
 * error, which — confirmed live — does NOT include a RetryInfo entry;
 * there's nothing to retry).
 */
export function extractRetryDelay(err: unknown): { raw: string; ms: number } | null {
  const details = (err as { errorDetails?: unknown })?.errorDetails;
  if (!Array.isArray(details)) return null;
  for (const d of details) {
    const entry = d as { "@type"?: string; retryDelay?: string };
    if (entry?.["@type"]?.includes("RetryInfo") && typeof entry.retryDelay === "string") {
      const match = entry.retryDelay.match(/^([\d.]+)s$/);
      if (match) {
        return { raw: entry.retryDelay, ms: Math.round(parseFloat(match[1]) * 1000) };
      }
    }
  }
  return null;
}
