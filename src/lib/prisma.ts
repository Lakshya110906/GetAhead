import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// When DATABASE_URL is a Prisma Accelerate connection string (prisma://...),
// queries are proxied over HTTPS through Accelerate's pool instead of each
// serverless invocation opening its own TCP connection straight to Aiven —
// that's the fix for connection exhaustion under concurrency. Locally (or
// anywhere DATABASE_URL is still a raw mysql:// string), this falls back to
// a direct connection exactly as before, so nothing breaks pre-migration.
//
// CONFIRMED as of this pass: DATABASE_URL in this project is still a raw
// mysql:// string, not prisma:// — Accelerate is installed but not actually
// active. Every serverless invocation opens its own direct TCP connection to
// Aiven's free-tier MySQL, whose max_connections is low. Two things follow:
const usingAccelerate = (process.env.DATABASE_URL || "").startsWith("prisma://");

// 1. `connection_limit` was not set anywhere (checked both .env files) —
// Prisma's MySQL default is `num_cpus * 2 + 1`, which on a host reporting
// several vCPUs means a single serverless instance could open 5-9
// connections on its own. With no pooler in front of a free-tier database,
// several concurrent instances can exhaust the cap fast. Appended here
// (not hand-edited into the env var, so it can't silently drift from this
// value) only when NOT using Accelerate, since Accelerate's own pooling
// makes a per-client connection_limit moot.
function withConnectionLimit(url: string): string {
  if (!url || url.startsWith("prisma://")) return url;
  if (/[?&]connection_limit=/.test(url)) return url; // already explicit — respect it
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=3`;
}

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: usingAccelerate
      ? undefined
      : { db: { url: withConnectionLimit(process.env.DATABASE_URL || "") } },
  });
  // Cast back to the plain PrismaClient type: every call site in this app
  // uses standard CRUD methods, which the Accelerate-extended client still
  // supports identically — only the (unused here) cacheStrategy option is
  // added. Typing it as the union of both shapes breaks every call site.
  return usingAccelerate ? (client.$extends(withAccelerate()) as unknown as PrismaClient) : client;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 2. This cache used to be gated behind `NODE_ENV !== "production"` — its
// only intended purpose (surviving Next.js dev-mode hot-reload clearing the
// module cache) never needed that gate, and gating it meant production's
// behavior was never actually exercised by the same code path as dev. Now
// unconditional: within one warm serverless instance, every request reuses
// the same client and its same bounded connection pool instead of anything
// depending on which mode evaluated the module first.
export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
