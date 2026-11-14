import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredData, RETENTION } from "@/lib/retention";
import { reapOrphanUploads, ORPHAN_UPLOAD_MIN_AGE_HOURS } from "@/lib/blobCleanup";
import { recordCronRun } from "@/lib/cronRuns";
import { logger } from "@/lib/logger";

// Daily retention enforcement. Every window lives in src/lib/retention.ts so
// it can be read next to the privacy policy's retention section that it
// makes true. Also reaps uploaded answer sheets that no evaluation
// references (rejected or abandoned uploads) once they are a day old.

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset — fail closed, do not allow unauthenticated cron calls
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await purgeExpiredData();
    const uploads = await reapOrphanUploads();
    const summary = { deleted, orphanUploads: uploads, retention: { ...RETENTION, orphanUploadMinAgeHours: ORPHAN_UPLOAD_MIN_AGE_HOURS } };
    logger.info("Retention purge ran", { stage: "sweep", ...deleted, orphanUploadsFound: uploads.found, orphanUploadsDeleted: uploads.deleted });
    await recordCronRun("purge-old-logs", true, { deleted, orphanUploads: uploads });
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Retention purge failed", { stage: "sweep", message });
    await recordCronRun("purge-old-logs", false, { error: message });
    return NextResponse.json({ ok: false, error: "Retention purge failed" }, { status: 500 });
  }
}
