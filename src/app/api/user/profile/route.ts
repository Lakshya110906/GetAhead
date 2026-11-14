import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodErrorResponse } from "@/lib/zodError";
import { reportApiError } from "@/lib/apiError";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  // Never sent by the settings page; bounded because it is copied into the
  // session JWT (an oversized value breaks that user's session cookie) and
  // must be an https URL if it is ever rendered.
  avatar: z
    .string()
    .max(2048)
    .refine((v) => v === "" || /^https:\/\//.test(v), "Avatar must be an https URL")
    .transform((v) => (v === "" ? null : v))
    .optional()
    .nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    return reportApiError({ code: "PROFILE_FETCH_FAILED", error, route: "GET /api/user/profile" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const { name, avatar } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    // The env-configured admin address can't be claimed by changing an
    // existing account's email either — same takeover path as signup (see
    // auth.ts). Same response as a taken address.
    const reservedAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const claimingReserved = reservedAdminEmail && email === reservedAdminEmail && current?.email !== reservedAdminEmail;

    // Check if new email is already taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });

    if (existing || claimingReserved) {
      return NextResponse.json(
        { error: "This email address is already taken by another account" },
        { status: 409 }
      );
    }

    // Update user profile details
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        avatar,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        avatar: updated.avatar,
      },
    });
  } catch (error) {
    return reportApiError({ code: "PROFILE_UPDATE_FAILED", error, route: "PUT /api/user/profile" });
  }
}
