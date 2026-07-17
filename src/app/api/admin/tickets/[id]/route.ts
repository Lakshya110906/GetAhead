import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { sendTicketReplyNotificationEmail } from "@/lib/email";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { name: true, avatar: true, role: true },
            },
          },
        },
        notes: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { name: true },
            },
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Admin fetch ticket detail API error:", error);
    return NextResponse.json({ error: "Failed to retrieve ticket" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not initialized" }, { status: 500 });
    }
    const adminId = adminUser.id;

    const { id } = await params;
    const body = await req.json();
    const { actionType, content } = body; // actionType: "reply" | "note"

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (actionType === "note") {
      // Add internal note
      const note = await prisma.ticketNote.create({
        data: {
          ticketId: id,
          userId: adminId,
          content: content.trim(),
        },
        include: {
          user: {
            select: { name: true },
          },
        },
      });

      return NextResponse.json({ success: true, note });
    } else {
      // Add admin reply
      const reply = await prisma.ticketReply.create({
        data: {
          ticketId: id,
          userId: adminId,
          senderType: "ADMIN",
          content: content.trim(),
        },
        include: {
          user: {
            select: { name: true, avatar: true, role: true },
          },
        },
      });

      // Update status to WAITING_USER (default for admin replies) or keep IN_PROGRESS
      await prisma.supportTicket.update({
        where: { id },
        data: {
          status: "WAITING_USER",
          updatedAt: new Date(),
        },
      });

      // Send email notification to user asynchronously
      try {
        await sendTicketReplyNotificationEmail(
          ticket.email,
          ticket.name,
          ticket.ticketNumber,
          content.trim()
        );
      } catch (emailError) {
        console.error("Failed to send ticket reply email notification:", emailError);
      }

      return NextResponse.json({ success: true, reply });
    }
  } catch (error) {
    console.error("Admin ticket action API error:", error);
    return NextResponse.json({ error: "Failed to perform ticket action" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    if (!verifyAdminToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });

    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await prisma.supportTicket.delete({
      where: { id },
    });

    // Log admin deletion in AuditLog
    await prisma.auditLog.create({
      data: {
        userId: adminUser?.id || null,
        action: "DELETE_SUPPORT_TICKET",
        details: `Deleted Ticket #TKT-${ticket.ticketNumber} (${ticket.subject})`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin ticket delete API error:", error);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}
