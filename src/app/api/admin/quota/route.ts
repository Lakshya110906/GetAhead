import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getAllModelUsageToday } from "@/lib/geminiQuotaState";

// "How much Gemini quota is left today?" — one glance, per model.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const usage = await getAllModelUsageToday();
    return NextResponse.json({ models: usage });
  } catch (error) {
    console.error("Admin quota fetch error:", error);
    return NextResponse.json({ error: "Failed to load quota data" }, { status: 500 });
  }
}
