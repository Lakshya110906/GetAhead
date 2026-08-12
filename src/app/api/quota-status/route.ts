import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getModelUsageToday } from "@/lib/geminiQuotaState";
import { MODEL_ID as PAPER_MODEL_ID } from "@/lib/question-agents";

// User-facing counterpart to /api/admin/quota — any signed-in user, not just
// admins, since "how much shared quota is left today" is exactly the fact
// that must be visible BEFORE a user starts an operation, per the standing
// rule: a user must never be told they have quota left when the shared
// Gemini ceiling is already exhausted. The per-user DAILY_QUOTA counters in
// quota.ts are a separate, secondary limit — this is the real, binding one.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Evaluation and paper generation both run on the same model today, so
    // one lookup covers both — kept as an object (not a flat number) so the
    // shape stays correct if that ever changes.
    const usage = await getModelUsageToday(PAPER_MODEL_ID);
    return NextResponse.json({
      model: usage.model,
      remaining: usage.remaining,
      limit: usage.limit,
      level: usage.level,
      resetsAt: usage.resetsAt,
    });
  } catch (error) {
    console.error("Quota status fetch error:", error);
    return NextResponse.json({ error: "Failed to load quota status" }, { status: 500 });
  }
}
