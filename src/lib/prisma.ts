import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// When DATABASE_URL is a Prisma Accelerate connection string (prisma://...),
// queries are proxied over HTTPS through Accelerate's pool instead of each
// serverless invocation opening its own TCP connection straight to Aiven —
// that's the fix for connection exhaustion under concurrency. Locally (or
// anywhere DATABASE_URL is still a raw mysql:// string), this falls back to
// a direct connection exactly as before, so nothing breaks pre-migration.
const usingAccelerate = (process.env.DATABASE_URL || "").startsWith("prisma://");

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
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

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
