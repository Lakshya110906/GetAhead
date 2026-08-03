import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getEvaluationMetrics } from "@/lib/metrics";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const metrics = await getEvaluationMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Admin metrics fetch error:", error);
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
