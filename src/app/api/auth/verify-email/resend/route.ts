import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

// Rate limit: 3 resends per hour per IP
async function checkVerificationResendRateLimit(ip: string): Promise<boolean> {
  const key = `verify-resend:${ip}`;
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
    return true; // Fail open
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    // Check Rate Limit
    const isAllowed = await checkVerificationResendRateLimit(ip);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again in an hour." },
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

    if (!user) {
      return NextResponse.json(
        { error: "No user account was found with this email address." },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This email address has already been verified." },
        { status: 400 }
      );
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    // Save/Overwrite token in DB
    // Use deleteMany to clear out old verification tokens for this email first
    await prisma.verificationToken.deleteMany({
      where: { identifier: emailClean },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: emailClean,
        token,
        expires,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(emailClean, user.name, token);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification link has been resent to your email address.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to resend verification email" }, { status: 500 });
  }
}
