import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Backs three specific privacy-policy commitments: error logs retained for
// 30 days then purged, audit logs retained for 12 months, and closed
// support tickets (which hold a name, email and free-text message, and
// survive account deletion via onDelete: SetNull) deleted 12 months after
// they were last touched. Without this cron those were just promises.
const ERROR_LOG_RETENTION_DAYS = 30;
const AUDIT_LOG_RETENTION_DAYS = 365;
const CLOSED_TICKET_RETENTION_DAYS = 365;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset — fail closed, do not allow unauthenticated cron calls
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errorLogCutoff = new Date(Date.now() - ERROR_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const auditLogCutoff = new Date(Date.now() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const ticketCutoff = new Date(Date.now() - CLOSED_TICKET_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [errorLogsDeleted, auditLogsDeleted, ticketsDeleted] = await Promise.all([
    prisma.errorLog.deleteMany({ where: { createdAt: { lt: errorLogCutoff } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditLogCutoff } } }),
    prisma.supportTicket.deleteMany({
      where: { status: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { lt: ticketCutoff } },
    }),
  ]);

  logger.info("Log retention purge ran", {
    stage: "sweep",
    errorLogsDeleted: errorLogsDeleted.count,
    auditLogsDeleted: auditLogsDeleted.count,
    ticketsDeleted: ticketsDeleted.count,
  });

  return NextResponse.json({
    ok: true,
    errorLogsDeleted: errorLogsDeleted.count,
    auditLogsDeleted: auditLogsDeleted.count,
    ticketsDeleted: ticketsDeleted.count,
  });
}
