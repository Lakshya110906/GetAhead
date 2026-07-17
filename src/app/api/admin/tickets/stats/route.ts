import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      total,
      byStatus,
      byPriority,
      byCategory,
      todayCount,
      weekCount,
      ticketsWithReplies,
    ] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.supportTicket.groupBy({
        by: ["priority"],
        _count: true,
      }),
      prisma.supportTicket.groupBy({
        by: ["category"],
        _count: true,
      }),
      prisma.supportTicket.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      prisma.supportTicket.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
      prisma.supportTicket.findMany({
        where: {
          replies: {
            some: { senderType: "ADMIN" },
          },
        },
        select: {
          id: true,
          createdAt: true,
          replies: {
            where: { senderType: "ADMIN" },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ]);

    // Parse status counts
    const statusCounts: Record<string, number> = {
      NEW: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_USER: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    byStatus.forEach((item) => {
      statusCounts[item.status.toUpperCase()] = item._count;
    });

    // Parse priority counts
    const priorityCounts: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    byPriority.forEach((item) => {
      priorityCounts[item.priority.toUpperCase()] = item._count;
    });

    // Parse category counts
    const categoryCounts: Record<string, number> = {
      general: 0,
      bug: 0,
      feature: 0,
      other: 0,
    };
    byCategory.forEach((item) => {
      categoryCounts[item.category.toLowerCase()] = item._count;
    });

    // Calculate average response time in hours
    let avgResponseHours = 0;
    if (ticketsWithReplies.length > 0) {
      let totalMs = 0;
      ticketsWithReplies.forEach((ticket) => {
        const firstReply = ticket.replies[0];
        if (firstReply) {
          const diff = firstReply.createdAt.getTime() - ticket.createdAt.getTime();
          totalMs += diff;
        }
      });
      avgResponseHours = totalMs / ticketsWithReplies.length / (1000 * 60 * 60);
    }

    return NextResponse.json({
      success: true,
      stats: {
        total,
        statusCounts,
        priorityCounts,
        categoryCounts,
        todayCount,
        weekCount,
        avgResponseHours: parseFloat(avgResponseHours.toFixed(1)),
        openTickets: (statusCounts.NEW || 0) + (statusCounts.OPEN || 0) + (statusCounts.IN_PROGRESS || 0) + (statusCounts.WAITING_USER || 0),
        closedTickets: (statusCounts.RESOLVED || 0) + (statusCounts.CLOSED || 0),
      },
    });
  } catch (error) {
    console.error("Admin ticket stats API error:", error);
    return NextResponse.json({ error: "Failed to load ticket analytics stats" }, { status: 500 });
  }
}
