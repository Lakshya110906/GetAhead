/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { reportApiError } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const category = searchParams.get("category") || "";

    const skip = (page - 1) * limit;

    // Build Prisma query condition
    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    if (search.trim()) {
      const searchLower = search.trim();
      const ticketNumberInt = parseInt(searchLower.replace("#TKT-", "").replace("TKT-", ""));

      where.OR = [
        { name: { contains: searchLower } },
        { email: { contains: searchLower } },
        { subject: { contains: searchLower } },
        { message: { contains: searchLower } },
      ];

      if (!isNaN(ticketNumberInt)) {
        where.OR.push({ ticketNumber: ticketNumberInt });
      }
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return reportApiError({ code: "TICKET_FETCH_FAILED", error, route: "GET /api/admin/tickets" });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json();
    const { ticketId, status, priority, assignedToId } = body;

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    // Prepare update data payload
    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
      },
    });

    // Lookup Admin User for logging
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });

    // Post system log in AuditLog
    await prisma.auditLog.create({
      data: {
        userId: adminUser?.id || null,
        action: "UPDATE_SUPPORT_TICKET",
        details: `Ticket #TKT-${updated.ticketNumber} updated attributes: ${JSON.stringify(updateData)}`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error) {
    return reportApiError({ code: "TICKET_ACTION_FAILED", error, route: "PATCH /api/admin/tickets" });
  }
}
