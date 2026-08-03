// Reproduces N concurrent Vercel serverless invocations locally by spawning
// N real separate OS processes (not just async calls in one process), each
// opening its own fresh PrismaClient against DATABASE_URL and holding the
// connection briefly — exactly the failure mode of connection exhaustion.
// A separate "monitor" connection samples Threads_connected during the run.
//
// Usage: node scripts/load-test-db-connections.mjs [N=50]
//
// Before the fix (raw mysql:// DATABASE_URL): expect failures with
// "ERROR 1040: Too many connections" once N exceeds the DB's max_connections.
// After the fix (DATABASE_URL is a Prisma Accelerate prisma:// string):
// expect 0 failures and a flat/low Threads_connected reading throughout,
// since Accelerate pools queries over HTTP rather than each process holding
// its own MySQL connection.
import { fork } from "child_process";
import { PrismaClient } from "@prisma/client";
import path from "path";

const N = Number(process.argv[2] || 50);
const WORKER = path.resolve(import.meta.dirname, "./_load-test-worker.mjs");

const monitor = new PrismaClient();

async function sampleConnections() {
  try {
    const rows = await monitor.$queryRawUnsafe("SHOW STATUS LIKE 'Threads_connected'");
    return Number(rows[0]?.Value ?? -1);
  } catch {
    return -1;
  }
}

const samples = [];
const sampler = setInterval(async () => {
  samples.push(await sampleConnections());
}, 300);

console.log(`Spawning ${N} concurrent separate processes against the real Aiven DB...`);
const t0 = Date.now();

const results = await Promise.all(
  Array.from({ length: N }, () => {
    return new Promise((resolve) => {
      const child = fork(WORKER, [], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.on("exit", () => {
        try {
          resolve(JSON.parse(out.trim().split("\n").pop()));
        } catch {
          resolve({ ok: false, error: "no output" });
        }
      });
    });
  })
);

clearInterval(sampler);
const totalMs = Date.now() - t0;

const succeeded = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
const errors = {};
for (const r of results) {
  if (!r.ok) errors[r.error] = (errors[r.error] || 0) + 1;
}

console.log(`\nTotal time: ${totalMs}ms`);
console.log(`Succeeded: ${succeeded}/${N}`);
console.log(`Failed: ${failed}/${N}`);
console.log("Error breakdown:", errors);
console.log("Threads_connected samples during run:", samples);
console.log("Peak observed connections:", Math.max(...samples));

await monitor.$disconnect();
