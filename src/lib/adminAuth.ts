import crypto from "crypto";
import { NextRequest } from "next/server";

const SECRET = process.env.NEXTAUTH_SECRET || "exameval-super-secret-key-change-in-production-2024";

// Simple dynamic in-memory lockouts for brute force rate limiting
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

export function encryptToken(data: Record<string, unknown>): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", crypto.scryptSync(SECRET, "salt", 32), iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptToken(token: string): Record<string, unknown> | null {
  try {
    const [ivHex, encrypted] = token.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.scryptSync(SECRET, "salt", 32), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function verifyAdminToken(request: NextRequest): boolean {
  const tokenCookie = request.cookies.get("exameval_admin_token")?.value;
  if (!tokenCookie) return false;

  const decoded = decryptToken(tokenCookie) as { isAdmin?: boolean; expires?: number } | null;
  if (!decoded || !decoded.isAdmin || !decoded.expires || decoded.expires < Date.now()) {
    return false;
  }
  return true;
}

export function handleRateLimit(ip: string): { success: boolean; error?: string } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt && attempt.lockUntil > now) {
    const waitSecs = Math.ceil((attempt.lockUntil - now) / 1000);
    return {
      success: false,
      error: `Too many login attempts. Please try again in ${waitSecs} seconds.`,
    };
  }

  return { success: true };
}

export function recordLoginAttempt(ip: string, success: boolean) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };

  if (success) {
    loginAttempts.delete(ip);
  } else {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.lockUntil = now + 15 * 60 * 1000; // 15 mins block
    } else {
      attempt.lockUntil = now + attempt.count * 2000; // incremental backoff delay
    }
    loginAttempts.set(ip, attempt);
  }
}
