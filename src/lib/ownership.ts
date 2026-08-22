import { NextResponse } from "next/server";

/**
 * The one place an ownership mismatch becomes an HTTP response. Every
 * caller passes in whatever "is this mine" boolean their resource actually
 * needs (a plain userId match, a userId-or-email match for guest-created
 * rows, an admin bypass ORed in) — this function's only job is making sure
 * the answer is always a 404, never a 403. That's the fix for a real bug:
 * /api/support/tickets/[id] returned 403 for a real ticket owned by someone
 * else and 404 for a nonexistent one, letting a caller enumerate valid
 * ticket ids by response code alone, while the sibling route
 * (/api/reports/save) already got this right. A shared function can't stop
 * someone from writing `return 403` by hand, but routing every ownership
 * check through here means there's no longer a separate place to write it.
 */
export function requireOwnership(isOwner: boolean, notFoundMessage = "Not found"): NextResponse | null {
  if (isOwner) return null;
  return NextResponse.json({ error: notFoundMessage }, { status: 404 });
}
