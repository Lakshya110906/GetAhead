import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isSessionRevoked, revokeSessionToken } from "@/lib/sessionRevocation";

// Short-lived on purpose: this is the token's own natural expiry, which
// bounds how long a revoked-but-KV-unreachable session could still work.
// Sign-out / password change / suspension invalidate immediately via the
// KV revocation list (see sessionRevocation.ts) rather than waiting for
// this to elapse — the expiry is just the fallback safety net.
const SESSION_MAX_AGE_SECONDS = 15 * 60;

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

        if (adminEmail && adminPassword && email === adminEmail && credentials.password === adminPassword) {
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
            // non-admin account (e.g. someone signed up normally with this
            // address before it was ever used to log in as admin). Matching
            // the real ADMIN_PASSWORD here is exactly the credential that's
            // supposed to grant admin access, so correct the role rather than
            // silently signing the operator into a STUDENT session.
            user = await prisma.user.update({
              where: { id: user.id },
              data: { role: "ADMIN" },
            });
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in: mint a new session identity. jti lets sign-out
        // revoke exactly this token; iat (our own, not relying on the
        // library's internal one) is what per-user revocation compares
        // against.
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.jti = randomUUID();
        token.iat = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const revoked = await isSessionRevoked(
          token.jti as string | undefined,
          token.id as string,
          token.iat as number | undefined
        );

        if (revoked) {
          return {
            ...session,
            user: undefined,
            expires: new Date(0).toISOString(),
          };
        }

        // Role/id come straight from the token — no MySQL query on the hot
        // path. A role change or suspension takes effect immediately anyway
        // because it revokes the token in KV (see revokeAllUserSessions),
        // forcing a fresh sign-in that mints a token with the new role.
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      const jti = (token as { jti?: string } | null)?.jti;
      if (jti) await revokeSessionToken(jti);
    },
  },
};
