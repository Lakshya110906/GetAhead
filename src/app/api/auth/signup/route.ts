import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { reportApiError } from "@/lib/apiError";
import { checkRateLimit } from "@/lib/rateLimit";
import { zodErrorResponse } from "@/lib/zodError";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["STUDENT", "TEACHER", "INSTITUTION"]).default("STUDENT"),
});

export async function POST(request: NextRequest) {
  try {
    // Every account starts with its own free daily evaluation/paper-
    // generation quota, so unrestricted signup is a direct quota bypass —
    // script up throwaway accounts, each with a fresh 10/day. proxy.ts
    // rate-limits /api/auth/:path* generally (10/min/IP), but that's sized
    // for auth-attempt flooding, not quota abuse; this is a much stricter,
    // signup-specific cap on top of it.
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    const isAllowed = await checkRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many accounts created from this network. Please try again in an hour." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const { name, role } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (error) {
    return reportApiError({ code: "AUTH_REQUEST_FAILED", error, route: "POST /api/auth/signup" });
  }
}
