import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTicketConfirmationEmail } from "@/lib/email";

// Rate limiting check helper: 5 submissions per hour per IP
async function checkTicketRateLimit(ip: string): Promise<boolean> {
  const key = `support:ticket:${ip}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });
    if (!existing) {
      await prisma.rateLimit.create({ data: { key, count: 1, resetAt } });
      return true;
    }
    if (existing.resetAt < now) {
      await prisma.rateLimit.update({ where: { key }, data: { count: 1, resetAt } });
      return true;
    }
    if (existing.count >= 5) return false;
    await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  } catch {
    return true; // Fail open if rate limit DB has issues
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as { id: string }).id : null;

    // Retrieve IP and User Agent
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Rate Limit check
    const isAllowed = await checkTicketRateLimit(ip);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many ticket submissions. Please wait an hour." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, category, subject, message } = body;

    // Validate inputs
    if (!name?.trim() || !email?.trim() || !category?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Set priority based on category or subject keywords
    let priority = "LOW";
    const messageLower = message.toLowerCase() + " " + subject.toLowerCase();
    if (category === "bug" || messageLower.includes("crash") || messageLower.includes("fail") || messageLower.includes("broken")) {
      priority = "MEDIUM";
    }
    if (messageLower.includes("urgent") || messageLower.includes("critical") || messageLower.includes("error 500")) {
      priority = "HIGH";
    }

    // Create Support Ticket in database
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category: category.trim(),
        subject: subject.trim(),
        message: message.trim(),
        priority,
        status: "NEW",
        ip,
        userAgent,
      },
    });

    // Send confirmation email asynchronously via Resend
    try {
      await sendTicketConfirmationEmail(
        ticket.email,
        ticket.name,
        ticket.ticketNumber,
        ticket.subject
      );
    } catch (emailError) {
      console.error("Failed to send ticket confirmation email:", emailError);
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
    });
  } catch (error) {
    console.error("Ticket submission API error:", error);
    return NextResponse.json({ error: "Failed to submit ticket" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    // Fetch tickets matching logged-in user id
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error("Fetch support tickets API error:", error);
    return NextResponse.json({ error: "Failed to retrieve tickets" }, { status: 500 });
  }
}
