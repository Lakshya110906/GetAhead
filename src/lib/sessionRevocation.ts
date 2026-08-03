import { kv } from "@vercel/kv";

// Session tokens are short-lived JWTs (see src/lib/auth.ts) — the common,
// per-request path never touches MySQL. This is the one thing that still
// needs to be checked per request to get immediate revocation (sign-out,
// password change, suspension) without waiting for natural token expiry,
// and it's an HTTP round trip to a KV store, not a pooled TCP connection.
//
// Two granularities:
//  - per-session (jti): "sign out this device" — revokes exactly one token.
//  - per-user (userId): password change / suspension / role change —
//    revokes every token issued before the revocation timestamp, i.e. every
//    existing session for that user, everywhere.

const SESSION_MAX_AGE_SECONDS = 15 * 60; // must match authOptions.session.maxAge
const USER_REVOCATION_TTL_SECONDS = 30 * 24 * 60 * 60; // outlive any plausible stale token

let warnedMissingKv = false;
function kvConfigured(): boolean {
  const configured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (!configured && !warnedMissingKv) {
    warnedMissingKv = true;
    console.warn(
      "[sessionRevocation] KV_REST_API_URL/KV_REST_API_TOKEN are not set — revocation checks are skipped " +
        "(sign-out/suspension will only take effect once the short-lived token naturally expires)."
    );
  }
  return configured;
}

export async function revokeSessionToken(jti: string): Promise<void> {
  if (!kvConfigured()) return;
  try {
    await kv.set(`revoked:jti:${jti}`, 1, { ex: SESSION_MAX_AGE_SECONDS });
  } catch (err) {
    console.error("[sessionRevocation] failed to revoke session token:", err);
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  if (!kvConfigured()) return;
  try {
    await kv.set(`revoked:user:${userId}`, Date.now(), { ex: USER_REVOCATION_TTL_SECONDS });
  } catch (err) {
    console.error("[sessionRevocation] failed to revoke user sessions:", err);
  }
}

/**
 * True if this specific token (by jti) has been individually revoked, or if
 * every token for this user issued before `issuedAtSeconds` (the JWT `iat`)
 * has been revoked. Fails open (not revoked) if KV isn't configured or is
 * unreachable — the short token lifetime bounds the blast radius of that.
 */
export async function isSessionRevoked(
  jti: string | undefined,
  userId: string,
  issuedAtSeconds: number | undefined
): Promise<boolean> {
  if (!kvConfigured()) return false;
  try {
    const [jtiRevoked, userRevokedAtMs] = await Promise.all([
      jti ? kv.get<number>(`revoked:jti:${jti}`) : Promise.resolve(null),
      kv.get<number>(`revoked:user:${userId}`),
    ]);

    if (jtiRevoked) return true;
    if (userRevokedAtMs && issuedAtSeconds && userRevokedAtMs > issuedAtSeconds * 1000) return true;
    return false;
  } catch (err) {
    console.error("[sessionRevocation] revocation check failed, failing open:", err);
    return false;
  }
}
