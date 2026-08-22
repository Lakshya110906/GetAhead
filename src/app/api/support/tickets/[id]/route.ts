import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportApiError } from "@/lib/apiError";
import { zodErrorResponse } from "@/lib/zodError";
import { requireOwnership } from "@/lib/ownership";

const ticketReplySchema = z.object({
  content: z.string().trim().min(1, "Reply content cannot be empty").max(10_000),
});

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

    const isAdmin = userRole === "ADMIN";
    const isOwner = ticket.userId === userId || ticket.email.toLowerCase() === session.user.email?.toLowerCase();
    const denied = requireOwnership(isOwner || isAdmin, "Ticket not found");
    if (denied) return denied;

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    return reportApiError({ code: "TICKET_FETCH_FAILED", error, route: "GET /api/support/tickets/[id]" });
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

    const parsed = ticketReplySchema.safeParse(await req.json());
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }
    const { content } = parsed.data;

    // Retrieve ticket details
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Admins can also reply here, but they should usually use the admin route.
    const isAdmin = userRole === "ADMIN";
    const isOwner = ticket.userId === userId || ticket.email.toLowerCase() === session.user.email?.toLowerCase();
    const denied = requireOwnership(isOwner || isAdmin, "Ticket not found");
    if (denied) return denied;

    // Create reply
    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId,
        senderType: isAdmin ? "ADMIN" : "USER",
        content,
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
    return reportApiError({ code: "TICKET_ACTION_FAILED", error, route: "POST /api/support/tickets/[id]" });
  }
}
