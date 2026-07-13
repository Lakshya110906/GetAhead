import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  try {
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        evaluations: { select: { id: true } },
        questionPapers: { select: { id: true } },
        savedReports: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      totalEvaluations: u.evaluations.length,
      questionPapersGenerated: u.questionPapers.length,
      reportsSaved: u.savedReports.length,
    }));

    return NextResponse.json({ users: formattedUsers, total, page, limit });
  } catch {
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, userId, newPassword } = await request.json();
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    if (action === "suspend") {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "SUSPENDED" },
      });
      await prisma.auditLog.create({
        data: { action: "USER_SUSPEND", details: `Suspended user ${userId}`, ip },
      });
    } else if (action === "activate") {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "STUDENT" }, // default active role
      });
      await prisma.auditLog.create({
        data: { action: "USER_ACTIVATE", details: `Activated user ${userId}`, ip },
      });
    } else if (action === "delete") {
      await prisma.user.delete({
        where: { id: userId },
      });
      await prisma.auditLog.create({
        data: { action: "USER_DELETE", details: `Deleted user ${userId}`, ip },
      });
    } else if (action === "reset-password") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      await prisma.auditLog.create({
        data: { action: "USER_PASSWORD_RESET", details: `Reset password for user ${userId}`, ip },
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to perform user action" }, { status: 500 });
  }
}
