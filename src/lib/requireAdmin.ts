import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

type RequireAdminResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * The one server-side admin check, called at the top of every /api/admin/*
 * route handler. There is exactly one session system (NextAuth) and exactly
 * one role claim to check — no separate admin cookie, no layout-only gate
 * that API routes could bypass.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id || user.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true, userId: user.id };
}
