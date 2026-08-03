import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account API error:", error);
    return NextResponse.json(
      { error: "Couldn't delete your account due to a server error. Try again in a moment." },
      { status: 500 }
    );
  }
}
