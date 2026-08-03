// Simulates one serverless invocation: fresh PrismaClient, one query, hold briefly, disconnect.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const start = Date.now();
try {
  await prisma.$queryRaw`SELECT 1`;
  await new Promise((r) => setTimeout(r, 800)); // hold the connection like a real request would
  console.log(JSON.stringify({ ok: true, ms: Date.now() - start }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, ms: Date.now() - start, error: String(e?.message || e).slice(0, 200) }));
} finally {
  await prisma.$disconnect();
}
