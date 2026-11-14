import { prisma } from "@/lib/prisma";

// Revocation used to live only in KV, which has never been configured in any
// Vercel environment, so every call here was a silent no-op: a password
// reset, password change, suspension or role change left existing sessions
// working. It also keyed on the JWT's jti/iat, which next-auth rewrites on
// every session read (jwt/index.js: setIssuedAt().setJti()), so a revoked
// token was re-issued with fresh values on the same request that rejected it.
//
// Now it is a timestamp on the user row, compared in auth.ts's jwt callback
// against the token's own sign-in time (authTime), a claim next-auth never
// rewrites. Every session for the user signed in before the cutoff ends on
// its next request.

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId }, data: { sessionsValidAfter: new Date() } });
}

/** True if a session signed in at `authTimeMs` was cut off by a later revocation. */
export function isRevokedAt(authTimeMs: number, sessionsValidAfter: Date | null): boolean {
  return sessionsValidAfter !== null && authTimeMs < sessionsValidAfter.getTime();
}
