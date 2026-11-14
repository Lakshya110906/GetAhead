import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSharedHeadroom, PENDING_EVALUATION_REQUESTS, PENDING_PAPER_REQUESTS } from "@/lib/geminiQuotaState";
import { MODEL_ID as PAPER_MODEL_ID } from "@/lib/question-agents";

// User-facing counterpart to /api/admin/quota — any signed-in user, not just
// admins, since "how much shared quota is left today" is exactly the fact
// that must be visible BEFORE a user starts an operation, per the standing
// rule: a user must never be told they have quota left when the shared
// Gemini ceiling is already exhausted. The per-user DAILY_QUOTA counters in
// quota.ts are a separate, secondary limit — this is the real, binding one.
// It reads the same headroom the enqueue gate does (queued work included),
// so it can't show room the gate would refuse.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Evaluation and paper generation both run on the same model today, so
    // one lookup covers both.
    const usage = await getSharedHeadroom(PAPER_MODEL_ID);
    const blocked = usage.level === "block";
    return NextResponse.json({
      model: usage.model,
      remaining: usage.remaining,
      limit: usage.limit,
      level: usage.level,
      resetsAt: usage.resetsAt,
      evaluationsLeft: blocked ? 0 : Math.floor(usage.remaining / PENDING_EVALUATION_REQUESTS),
      papersLeft: blocked ? 0 : Math.floor(usage.remaining / PENDING_PAPER_REQUESTS),
    });
  } catch (error) {
    console.error("Quota status fetch error:", error);
    return NextResponse.json({ error: "Failed to load quota status" }, { status: 500 });
  }
}
