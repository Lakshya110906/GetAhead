import { prisma } from "@/lib/prisma";

// The JWT session strategy (see auth.ts's session callback) has no
// per-request DB lookup — a token minted before account deletion stays
// "valid" for its natural lifetime whenever KV-backed revocation can't be
// consulted (see sessionRevocation.ts / delete-account's revokeAllUserSessions
// call). Every Gemini-quota-consuming route needs this same check before it
// trusts session.user.id as a live foreign key, or it crashes on a
// foreign-key violation instead of returning a clean, honest response —
// found once in POST /api/evaluations and then duplicated by hand into
// POST /api/papers and the tutor stream route. Pulled out here so the next
// quota-consuming route gets it by calling this instead of retyping it.
export async function userStillExists(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  return user !== null;
}
