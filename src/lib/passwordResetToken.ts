import { createHash, randomBytes } from "crypto";

// Reset links carry the raw token; the database keeps only its SHA-256, so a
// read of the PasswordResetToken table (backup, log, SQL access) can't be
// turned into working reset links. A 32-byte random token needs no salt or
// slow hash: it can't be guessed, only copied.
export function newResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
