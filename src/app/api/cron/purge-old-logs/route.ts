import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Backs two specific privacy-policy commitments: error logs retained for 30
// days then purged, audit logs retained for 12 months. Without this cron
// those were just promises — nothing deleted either table before it existed.
const ERROR_LOG_RETENTION_DAYS = 30;
const AUDIT_LOG_RETENTION_DAYS = 365;

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

  const [errorLogsDeleted, auditLogsDeleted] = await Promise.all([
    prisma.errorLog.deleteMany({ where: { createdAt: { lt: errorLogCutoff } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditLogCutoff } } }),
  ]);

  logger.info("Log retention purge ran", {
    stage: "sweep",
    errorLogsDeleted: errorLogsDeleted.count,
    auditLogsDeleted: auditLogsDeleted.count,
  });

  return NextResponse.json({
    ok: true,
    errorLogsDeleted: errorLogsDeleted.count,
    auditLogsDeleted: auditLogsDeleted.count,
  });
}
