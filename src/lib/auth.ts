import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { isRevokedAt, revokeAllUserSessions, revokeSession } from "@/lib/sessionRevocation";

// An idle timeout, not a lifetime: next-auth re-issues the token with a new
// expiry on every session read, so a session in use never reaches it.
// SESSION_ABSOLUTE_MAX_MS is the lifetime: after it, sign in again however
// active the session is. Revocation (password change, suspension...) is
// checked on every request in the jwt callback below.
const SESSION_MAX_AGE_SECONDS = 15 * 60;
const SESSION_ABSOLUTE_MAX_MS = 7 * 24 * 60 * 60 * 1000;
// A cost-12 hash of a random string nobody knows, matching real hashes' cost.
// Made on first use, not at import, to keep it off every cold start.
let dummyPasswordHash: Promise<string> | undefined;
const getDummyPasswordHash = () => (dummyPasswordHash ??= bcrypt.hash(randomBytes(16).toString("hex"), 12));

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.trim().toLowerCase();
        // No hardcoded fallback for either value: if the operator hasn't
        // configured both, the admin-bootstrap branch below is simply
        // unreachable (adminEmail/adminPassword are undefined and can never
        // equal a submitted credential) rather than silently defaulting to
        // a well-known email/password pair that anyone reading the source
        // could log in with.
        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;

        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (adminEmail && adminPassword && email === adminEmail && secretsEqual(credentials.password, adminPassword)) {
          if (!user) {
            const hashedPassword = await bcrypt.hash(adminPassword, 12);
            user = await prisma.user.create({
              data: {
                email,
                name: "Administrator",
                password: hashedPassword,
                role: "ADMIN",
              },
            });
          } else if (user.role !== "ADMIN") {
            // The reserved admin email can end up attached to a pre-existing,
            // non-admin account — signup doesn't verify email ownership, so
            // anyone who knows the address could create it first, with a
            // password of their choosing. Promoting that row while keeping its
            // password hash (as this used to) handed admin to whoever created
            // it: they could then sign in through the ordinary password check
            // below with their own password and get role ADMIN. Promotion now
            // also replaces the password with ADMIN_PASSWORD's hash and revokes
            // every existing session, so the only credential that reaches this
            // admin account is the operator's. Signup also refuses this address
            // outright (api/auth/signup), so this branch should never run.
            user = await prisma.user.update({
              where: { id: user.id },
              data: { role: "ADMIN", password: await bcrypt.hash(adminPassword, 12) },
            });
            await revokeAllUserSessions(user.id);
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.avatar,
          };
        }

        if (!user || !user.password) {
          // Same bcrypt cost as a real check, so response time doesn't tell
          // an unknown email apart from a wrong password.
          await bcrypt.compare(credentials.password, await getDummyPasswordHash());
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        // Enforce user suspension check
        if (user.role === "SUSPENDED" || user.suspended) {
          throw new Error("Your account has been suspended");
        }

        // Email verification is not required to sign in. The emailVerified
        // column stays on the schema for possible future soft-verification
        // use, but nothing gates on it today — new signups simply leave it
        // null.

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
  events: {
    // Signing out clears the cookie in this browser only. Recording the
    // session id ends any copy of the cookie too, on its next request.
    async signOut({ token }) {
      if (typeof token?.id === "string" && typeof token.sid === "string") {
        const authTimeMs = typeof token.authTime === "number" ? token.authTime : Date.now();
        // Never blocks the sign-out itself (e.g. the account was just deleted).
        await revokeSession(token.sid, token.id, new Date(authTimeMs + SESSION_ABSOLUTE_MAX_MS)).catch((error) =>
          logger.warn("Couldn't record a signed-out session", { message: error instanceof Error ? error.message : String(error) })
        );
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in. authTime is our own claim: next-auth rewrites iat
        // and jti every time it re-issues the token, so neither can say when
        // this session actually began.
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.authTime = Date.now();
        // This session's own id, so signing out can end just this one.
        token.sid = randomUUID();
        return token;
      }
      if (!token.id) return token;

      // Every request: the session must still belong to a live, unsuspended
      // user and must not predate a revocation. One primary-key read; it
      // also picks up role changes without waiting for a new sign-in.
      // Tokens issued before authTime existed fall back to iat (seconds).
      const authTimeMs = typeof token.authTime === "number" ? token.authTime : ((token.iat as number | undefined) ?? 0) * 1000;
      const sid = typeof token.sid === "string" ? token.sid : null;
      const current = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: {
          role: true,
          suspended: true,
          sessionsValidAfter: true,
          revokedSessions: sid ? { where: { sid }, select: { sid: true } } : false,
        },
      });
      const ended =
        !current ||
        current.suspended ||
        current.role === "SUSPENDED" ||
        isRevokedAt(authTimeMs, current.sessionsValidAfter) ||
        (current.revokedSessions?.length ?? 0) > 0 ||
        Date.now() - authTimeMs > SESSION_ABSOLUTE_MAX_MS;
      if (ended) return {};

      token.role = current.role;
      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        // Ended in the jwt callback above. An empty object is what both
        // getServerSession and the client's useSession read as "no session"
        // (next-auth next/index.js, client/_utils.js: Object.keys(...).length).
        return {} as typeof session;
      }
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};

// Constant-time comparison for the env-configured admin password. Hashing both
// sides first gives equal-length buffers, which timingSafeEqual requires, and
// avoids leaking the secret's length through an early length mismatch.
function secretsEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
