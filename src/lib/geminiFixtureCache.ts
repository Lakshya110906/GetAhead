import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";

// Content-addressed record/replay cache for Gemini calls, used ONLY by test
// harnesses that opt in by passing a ReplayOptions — production call sites
// (extractAnswerSheet, gradeQuestionOnce) never touch this when the caller
// doesn't pass one, so a real user's evaluation is completely unaffected.
//
// The cache key is a hash of the EXACT inputs that produced the prompt (file
// bytes + prompt version for extraction; the fully-rendered grading prompt
// text for grading) — so a prompt/rubric change naturally invalidates the
// old recording instead of silently replaying a stale response, and any
// caller re-running the identical inputs gets a hit, not just one hardcoded
// "fixture id."
const CACHE_ROOT = join(process.cwd(), "fixtures", "gemini-cache");

export function hashOf(...parts: (string | Buffer)[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 24);
}

export interface ReplayOptions {
  // Ignore any cached recording and always hit the real API, then overwrite
  // the cache with the fresh result. This is what --live-fixtures sets, for
  // deliberately re-verifying model behavior after a prompt change.
  forceLive?: boolean;
  // Called once per REAL Gemini call made (never on a cache hit) — lets a
  // caller assert exactly how many live calls a run made.
  onRealCall?: (label: string) => void;
}

function pathFor(bucket: string, key: string): string {
  return join(CACHE_ROOT, bucket, `${key}.json`);
}

export function readReplay<T>(bucket: string, key: string, opts?: ReplayOptions): T | null {
  if (!opts || opts.forceLive) return null;
  const p = pathFor(bucket, key);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

export function writeReplay<T>(bucket: string, key: string, value: T): void {
  const dir = join(CACHE_ROOT, bucket);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(pathFor(bucket, key), JSON.stringify(value, null, 2));
}
