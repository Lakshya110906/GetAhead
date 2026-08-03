import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public, unauthenticated, and deliberately cheap — this is the endpoint an
// external uptime monitor (Vercel Monitoring / UptimeRobot / Better Uptime /
// etc.) should be pointed at on a 1–5 minute interval so a dead worker or a
// down database is discovered by a page, not by a user's support ticket.
// Wiring an actual external monitor to this URL is an operational step this
// codebase can't perform on its own — set one up and point it here.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", time: new Date().toISOString() });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ status: "down", time: new Date().toISOString() }, { status: 503 });
  }
}
