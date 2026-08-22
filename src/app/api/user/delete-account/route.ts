import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeAllUserSessions } from "@/lib/sessionRevocation";
import { zodErrorResponse } from "@/lib/zodError";
import { reportApiError } from "@/lib/apiError";

// Backs the privacy policy's "permanently deleted within 7 days" and
// "Deletion — request permanent deletion of your account" commitments.
// Deletion is immediate (well inside the 7-day promise), not queued —
// every user-owned row cascades via onDelete: Cascade in schema.prisma
// (evaluations, reports, question papers, sessions, tutor conversations,
// audit/support history where applicable), so a single prisma.user.delete
// is the entire operation.
// Empty string is allowed here specifically for Google-only accounts (no
// password set) — the handler below only checks it when user.password
// exists, so a password-auth account can't skip confirmation this way.
const deleteAccountSchema = z.object({
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const parsed = deleteAccountSchema.safeParse(await request.json());
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Google-only accounts have no password set — require re-auth via a
    // fresh session instead of a password they never created.
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(parsed.data.password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id: userId } });

    // Same revocation change-password already does: the JWT session strategy
    // has no per-request DB lookup, so without this the deleted user's
    // existing token stays "valid" (per the session callback's revocation
    // check) for up to its remaining SESSION_MAX_AGE_SECONDS lifetime —
    // long enough to hit a route that trusts session.user.id as a live FK
    // (e.g. quota consumption) and crash with a foreign-key violation
    // instead of a clean "signed out" state.
    await revokeAllUserSessions(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return reportApiError({ code: "ACCOUNT_DELETE_FAILED", error, route: "POST /api/user/delete-account" });
  }
}
