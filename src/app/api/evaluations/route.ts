import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processSpecificJob } from "@/lib/evaluationWorker";
import { MAX_UPLOAD_BYTES } from "@/app/api/uploads/route";
import { consumeQuota, QuotaExceededError } from "@/lib/quota";
import { assertSpendGateOpen, SpendLimitReachedError } from "@/lib/spendControl";
import { assertQuotaHeadroom, QuotaHeadroomError, PreviewEnvironmentBlockedError } from "@/lib/geminiQuotaState";
import { MODEL_ID as EVAL_MODEL_ID } from "@/lib/answerSheetGrading";
import { assertDeclaredTypeMatches } from "@/lib/fileSignature";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/errorTracking";
import { reportApiError } from "@/lib/apiError";
import { normalizeEntryText } from "@/lib/normalizeText";
import { zodErrorResponse } from "@/lib/zodError";
import { userStillExists } from "@/lib/requireLiveUser";

// after() keeps the worker call running past the point the response is
// sent, so this stays fast for the client while the real work (which can
// legitimately take tens of seconds) happens in the background of the same
// invocation. This route's own maxDuration needs headroom for that.
export const maxDuration = 60;

const MAX_PAGES = 25;

const enqueueSchema = z.object({
  fileUrl: z.string().url(),
  fileKey: z.string().optional(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  fileType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  // Normalized (trimmed, whitespace-collapsed) BEFORE the length check, not
  // after — otherwise a subject of all-whitespace would pass min(1) as a
  // "real" value, and a real one with stray leading/trailing/doubled
  // spaces would reach analytics' subject-grouping unnormalized (which
  // groups by raw string equality, so "Mathematics" and "Mathematics "
  // would silently split into two rows).
  subject: z.string().transform(normalizeEntryText).pipe(z.string().min(1, "Subject is required")),
  grade: z.string().transform(normalizeEntryText).optional(),
  examType: z.enum(["MCQ", "Descriptive", "Mixed"]),
});

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = (session.user as { id: string }).id;

    if (!(await userStillExists(userId))) {
      return NextResponse.json({ error: "Your account is no longer valid. Please sign in again." }, { status: 401 });
    }

    const parsed = enqueueSchema.safeParse(await request.json());
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }
    const { fileUrl, fileKey, fileName, fileSize, fileType, subject, grade, examType } = parsed.data;

    if (fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `That file is too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB — try scanning at a lower resolution.` },
        { status: 413 }
      );
    }

    // Global kill switch first: no point spending a quota unit or a
    // download on a job we're not going to run today.
    try {
      await assertSpendGateOpen();
    } catch (err) {
      if (err instanceof SpendLimitReachedError) {
        return NextResponse.json(
          { error: err.message, maintenance: true },
          { status: 503 }
        );
      }
      throw err;
    }

    // Gemini's own daily quota, not the per-user app-level one below: an
    // evaluation needs at least 2 real requests (extraction + at least one
    // grading call; the true count depends on how many questions the sheet
    // turns out to have, which isn't known until extraction runs, so 2 is
    // the floor, not the full estimate). Failing here means the user never
    // burns their own daily evaluation credit on an operation that was
    // already going to run out of Gemini quota partway through.
    // Deliberately conservative: this checks BEFORE the file is even
    // downloaded (below), so it can't yet know whether this exact input
    // already has a GradingCache hit and would need zero real calls (see
    // gradingCache.ts / evaluationWorker.ts). Worst case this occasionally
    // blocks a request that would have been free — never the other
    // direction (letting one through that can't actually complete).
    try {
      await assertQuotaHeadroom(EVAL_MODEL_ID, 2);
    } catch (err) {
      if (err instanceof QuotaHeadroomError) {
        return NextResponse.json(
          { error: err.message, quotaExceeded: true, remaining: err.usage.remaining, limit: err.usage.limit, resetsAt: err.usage.resetsAt },
          { status: 503 }
        );
      }
      if (err instanceof PreviewEnvironmentBlockedError) {
        return NextResponse.json({ error: err.message, previewBlocked: true }, { status: 503 });
      }
      throw err;
    }

    // Per-user daily quota, enforced server-side before any paid call.
    try {
      await consumeQuota(userId, "EVALUATION");
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return NextResponse.json(
          { error: err.message, quotaExceeded: true, limit: err.limit, resetsAt: err.resetsAt.toISOString() },
          { status: 429 }
        );
      }
      throw err;
    }

    // fileUrl is client-supplied and, until here, only validated as "is a
    // URL" (zod's .url()) — fetching it server-side with no further check
    // is an SSRF primitive: a client could point it at an internal-only
    // address instead of an actual uploaded file. Every real fileUrl comes
    // from POST /api/uploads's handleUpload() call, which only ever hands
    // back a *.public.blob.vercel-storage.com URL (see @vercel/blob's own
    // docs), so anything else is never a legitimate upload.
    let parsedFileUrl: URL;
    try {
      parsedFileUrl = new URL(fileUrl);
    } catch {
      return NextResponse.json({ error: "That file URL isn't valid. Try uploading again." }, { status: 400 });
    }
    if (!parsedFileUrl.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return NextResponse.json({ error: "That file URL isn't valid. Try uploading again." }, { status: 400 });
    }
    // The hostname check above only rules out a non-Blob URL (the SSRF
    // fix) — it says nothing about WHICH user's blob this is. /api/uploads
    // always writes under answer-sheets/{userId}/..., so the path itself is
    // the ownership check: without this, any caller who obtains another
    // user's blob URL (these are public, unauthenticated links — see the
    // storage-privacy finding) could submit it as their OWN evaluation
    // input and have someone else's file graded under their account.
    if (!parsedFileUrl.pathname.startsWith(`/answer-sheets/${userId}/`)) {
      return NextResponse.json({ error: "That file URL isn't valid. Try uploading again." }, { status: 400 });
    }

    // Download once, use for both the magic-byte check and (for PDFs) the
    // page-count check below — never trust the extension or the
    // client-supplied Content-Type for what a file actually is.
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Couldn't read the uploaded file. Try uploading again." }, { status: 502 });
    }
    const bytes = new Uint8Array(await fileRes.arrayBuffer());

    try {
      assertDeclaredTypeMatches(bytes, fileType);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Unrecognized file type." }, { status: 400 });
    }

    let pageCount = 1;
    if (fileType === "application/pdf") {
      try {
        const pdf = await PDFDocument.load(bytes);
        pageCount = pdf.getPageCount();
      } catch {
        return NextResponse.json({ error: "That file doesn't look like a valid PDF. Try re-exporting or scanning it again." }, { status: 400 });
      }
      if (pageCount > MAX_PAGES) {
        return NextResponse.json(
          { error: `That PDF has ${pageCount} pages. The limit is ${MAX_PAGES} pages per evaluation — split it and upload in parts.` },
          { status: 413 }
        );
      }
    }

    const job = await prisma.evaluation.create({
      data: {
        userId,
        subject,
        grade: grade || "12th",
        examType,
        status: "QUEUED",
        originalFileName: fileName,
        fileUrl,
        fileKey,
        fileSize,
        fileType,
        pageCount,
      },
    });

    logger.info("Evaluation enqueued", { jobId: job.id, stage: "enqueue", userId, subject, examType, pageCount });

    // Fire the worker in the background of this same invocation. The
    // cron sweep is the backstop if this never runs or the function dies
    // before it finishes — the job row is already durably QUEUED either way.
    after(async () => {
      try {
        await processSpecificJob(job.id);
      } catch (err) {
        logger.error("Background worker trigger failed", { jobId: job.id, stage: "worker-trigger", error: String(err) });
        captureException(err, { jobId: job.id, stage: "worker-trigger" });
      }
    });

    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error) {
    return reportApiError({ code: "EVAL_ENQUEUE_FAILED", error, route: "POST /api/evaluations", userId });
  }
}
