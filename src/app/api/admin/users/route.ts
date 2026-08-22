import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { revokeAllUserSessions } from "@/lib/sessionRevocation";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { reportApiError } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
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
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "GET /api/admin/users" });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { action, userId, newPassword } = await request.json();
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    if (action === "suspend") {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "SUSPENDED" },
      });
      await revokeAllUserSessions(userId);
      await prisma.auditLog.create({
        data: { action: "USER_SUSPEND", details: `Suspended user ${userId}`, ip },
      });
    } else if (action === "activate") {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "STUDENT" }, // default active role
      });
      await revokeAllUserSessions(userId); // force re-login so the new role takes effect immediately
      await prisma.auditLog.create({
        data: { action: "USER_ACTIVATE", details: `Activated user ${userId}`, ip },
      });
    } else if (action === "delete") {
      await prisma.user.delete({
        where: { id: userId },
      });
      await revokeAllUserSessions(userId);
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
      await revokeAllUserSessions(userId);
      await prisma.auditLog.create({
        data: { action: "USER_PASSWORD_RESET", details: `Reset password for user ${userId}`, ip },
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return reportApiError({ code: "ADMIN_ACTION_FAILED", error, route: "POST /api/admin/users" });
  }
}
