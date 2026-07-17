import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const userRole = (session.user as { role?: string }).role;

    // Retrieve ticket details
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
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Authorization: User must own the ticket or be an admin
    const isAdmin = userRole === "ADMIN";
    const isOwner = ticket.userId === userId || ticket.email.toLowerCase() === session.user.email?.toLowerCase();

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Fetch support ticket detail API error:", error);
    return NextResponse.json({ error: "Failed to retrieve ticket" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const userRole = (session.user as { role?: string }).role;

    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Reply content cannot be empty" }, { status: 400 });
    }

    // Retrieve ticket details
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Validate ownership (Admins can also reply here, but they should usually use the admin route)
    const isAdmin = userRole === "ADMIN";
    const isOwner = ticket.userId === userId || ticket.email.toLowerCase() === session.user.email?.toLowerCase();

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create reply
    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId,
        senderType: isAdmin ? "ADMIN" : "USER",
        content: content.trim(),
      },
      include: {
        user: {
          select: { name: true, avatar: true, role: true },
        },
      },
    });

    // Update status to OPEN if user replied, or update timestamp
    await prisma.supportTicket.update({
      where: { id },
      data: {
        status: isAdmin ? ticket.status : "OPEN",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("User reply support ticket API error:", error);
    return NextResponse.json({ error: "Failed to post reply" }, { status: 500 });
  }
}
