import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { reportApiError } from "@/lib/apiError";
import { zodErrorResponse } from "@/lib/zodError";
import { revokeAllUserSessions } from "@/lib/sessionRevocation";
import { hashResetToken } from "@/lib/passwordResetToken";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const { token, password } = parsed.data;

    // Stored hashed (see passwordResetToken.ts). Links issued before that
    // change stored the raw value and simply stop working; they expired
    // within the hour anyway.
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashResetToken(token) },
    });

    if (!resetToken || resetToken.used || resetToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Password reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    // Find matched user
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No user account was found for this reset link." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Consuming the link is conditional on it still being unused, inside the
    // same transaction as the password change: two submissions of one link
    // used to both pass the check above and both set a password. Every
    // other outstanding link for this email is burned too.
    const consumed = await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, used: false, expires: { gte: new Date() } },
        data: { used: true },
      });
      if (claimed.count !== 1) return false;
      await tx.passwordResetToken.updateMany({ where: { email: resetToken.email, used: false }, data: { used: true } });
      await tx.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
      return true;
    });
    if (!consumed) {
      return NextResponse.json({ error: "Password reset link is invalid or has expired." }, { status: 400 });
    }

    // Same reasoning as change-password: if the account was compromised,
    // the attacker's existing session must not survive the legitimate
    // user's reset. Without this, a token minted before the reset stays
    // "valid" (per the JWT session callback's revocation check) for its
    // remaining natural lifetime.
    await revokeAllUserSessions(user.id);

    // Record audit action
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_SUCCESS",
        details: `Successfully reset password for email ${resetToken.email}`,
        ip,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset.",
    });
  } catch (error) {
    return reportApiError({ code: "AUTH_REQUEST_FAILED", error, route: "POST /api/auth/reset-password" });
  }
}
