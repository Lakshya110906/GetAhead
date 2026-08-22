import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { captureException } from "@/lib/errorTracking";
import { reportApiError } from "@/lib/apiError";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    // 3 password reset requests per hour per IP
    const isAllowed = await checkRateLimit(`forgot-password:${ip}`, 3, 60 * 60 * 1000);
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
      // Logged and captured for real visibility into the failure, but the
      // client response below must stay identical to the success case —
      // a distinct response here (previously a 500 with a different
      // message) is a user-enumeration side channel: it tells a caller
      // "this email exists AND belongs to a real account" whenever
      // delivery happens to fail, which the generic response above is
      // specifically designed to never reveal.
      console.error("Failed to send reset password email:", emailErr);
      captureException(emailErr, { route: "POST /api/auth/forgot-password", stage: "send-email" });
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    return reportApiError({ code: "AUTH_REQUEST_FAILED", error, route: "POST /api/auth/forgot-password" });
  }
}
