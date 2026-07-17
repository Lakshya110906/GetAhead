import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

// Rate limit: 3 password reset requests per hour per IP
async function checkForgotPasswordRateLimit(ip: string): Promise<boolean> {
  const key = `forgot-password:${ip}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour window

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });
    if (!existing) {
      await prisma.rateLimit.create({ data: { key, count: 1, resetAt } });
      return true;
    }
    if (existing.resetAt < now) {
      await prisma.rateLimit.update({ where: { key }, data: { count: 1, resetAt } });
      return true;
    }
    if (existing.count >= 3) {
      return false;
    }
    await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  } catch {
    return true; // Fail open to not block users on database glitches
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    
    // Check Rate Limit
    const isAllowed = await checkForgotPasswordRateLimit(ip);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again in an hour." },
        { status: 429 }
      );
    }

    const { email } = await request.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const emailClean = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailClean },
    });

    // To prevent user enumeration attacks, return success even if user doesn't exist
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Save token in DB
    await prisma.passwordResetToken.create({
      data: {
        email: emailClean,
        token,
        expires,
      },
    });

    // Send reset email
    try {
      await sendPasswordResetEmail(emailClean, user.name, token);
      
      // Log audit action
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUEST",
          details: `Password reset token generated for ${emailClean}`,
          ip,
        },
      });
    } catch (emailErr) {
      console.error("Failed to send reset password email:", emailErr);
      return NextResponse.json(
        { error: "Failed to send reset email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return NextResponse.json({ error: "Failed to process forgot password request" }, { status: 500 });
  }
}
