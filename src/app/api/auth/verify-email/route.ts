import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find token in database
    const verifyToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verifyToken || verifyToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    // Find user by email (stored in identifier)
    const user = await prisma.user.findUnique({
      where: { email: verifyToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 400 }
      );
    }

    // Update user's emailVerified date
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Delete token from VerificationToken list
    await prisma.verificationToken.delete({
      where: { token },
    });

    // Log verification audit event
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "EMAIL_VERIFICATION_SUCCESS",
        details: `Email address ${user.email} successfully verified`,
        ip,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your email address has been successfully verified.",
    });
  } catch (error) {
    console.error("Email verification API error:", error);
    return NextResponse.json({ error: "Failed to verify email address." }, { status: 500 });
  }
}
