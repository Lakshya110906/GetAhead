import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getTodaysSpend } from "@/lib/spendControl";

// "See today's spend without opening the Google console" — this is that.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const spend = await getTodaysSpend();
    return NextResponse.json(spend);
  } catch (error) {
    console.error("Admin spend fetch error:", error);
    return NextResponse.json({ error: "Failed to load spend data" }, { status: 500 });
  }
}
