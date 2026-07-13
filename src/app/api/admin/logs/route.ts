import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "all"; // error or audit
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "15");
  const skip = (page - 1) * limit;

  try {
    if (type === "error") {
      const where: Prisma.ErrorLogWhereInput = {};
      if (search) {
        where.OR = [
          { message: { contains: search } },
          { type: { contains: search } },
        ];
      }
      const total = await prisma.errorLog.count({ where });
      const logs = await prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });
      return NextResponse.json({ logs, total, page, limit, type: "error" });
    } else {
      const where: Prisma.AuditLogWhereInput = {};
      if (search) {
        where.OR = [
          { action: { contains: search } },
          { details: { contains: search } },
        ];
      }
      const total = await prisma.auditLog.count({ where });
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });
      return NextResponse.json({ logs, total, page, limit, type: "audit" });
    }
  } catch {
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}
