import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// TEST-ONLY: simulates a worker that was killed mid-step by force-aging a
// job's lock, without going through processJobStep() at all — this is
// exactly the state a hard-killed serverless invocation would leave behind
// (status "running", lockedAt set, but no further progress). Used to prove
// recoverability (proof test 3) without needing a real multi-minute
// generation to actually be interrupted. Dev-only by construction: 404s
// outside development so it can never be reachable in production.
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { jobId } = await request.json();
  const job = await prisma.paperGenerationJob.findFirst({ where: { id: jobId, userId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await prisma.paperGenerationJob.update({
    where: { id: jobId },
    data: { status: "running", lockedAt: new Date(Date.now() - 60_000) }, // 60s old — well past the 20s staleness threshold
  });

  return NextResponse.json({ ok: true });
}
