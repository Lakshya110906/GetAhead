import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  avatar: z.string().optional().nullable(),
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
    console.error("Profile GET API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, avatar } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    // Check if new email is already taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });

    if (existing) {
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
    console.error("Profile PUT API error:", error);
    return NextResponse.json(
      { error: "Failed to update profile settings" },
      { status: 500 }
    );
  }
}
