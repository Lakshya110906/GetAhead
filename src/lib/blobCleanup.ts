import { del, list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ownStores, storeForUrl } from "@/lib/blobStore";

// Deletes uploaded answer-sheet files from Vercel Blob. Before this existed,
// nothing ever removed a file from storage: deleting an account cascaded
// every database row but left the sheets themselves at their public
// *.public.blob.vercel-storage.com URLs indefinitely — which made the
// privacy policy's "all associated data is permanently deleted" untrue for
// the most sensitive data the service holds. Called after the DB delete
// (so the user-visible deletion is already done), best-effort: a storage
// failure is logged loudly, never surfaced as "we couldn't delete your
// account".
export async function deleteBlobFiles(
  files: Array<{ fileUrl: string | null; fileKey: string | null }>,
  context: Record<string, unknown>
): Promise<{ attempted: number; failed: number }> {
  const targets = files.map((f) => f.fileUrl || f.fileKey).filter((t): t is string => Boolean(t));
  if (targets.length === 0) return { attempted: 0, failed: 0 };

  const stores = ownStores();
  if (stores.length === 0) {
    logger.error("Blob cleanup skipped: no Blob token is set — uploaded files were NOT deleted from storage", {
      ...context,
      count: targets.length,
    });
    return { attempted: targets.length, failed: targets.length };
  }

  // A URL names its store. A bare pathname doesn't, so it's deleted from
  // every store we own (deleting a missing file is a no-op). A URL in no
  // store of ours can't be deleted by us at all.
  const byHost = new Map<string, string[]>(stores.map((st) => [st.host, []]));
  let failed = 0;
  for (const t of targets) {
    if (/^https?:/.test(t)) {
      const store = storeForUrl(t);
      if (store) byHost.get(store.host)!.push(t);
      else failed++;
    } else {
      for (const list of byHost.values()) list.push(t);
    }
  }

  for (const store of stores) {
    const list = byHost.get(store.host)!;
    if (list.length === 0) continue;
    try {
      await del(list, { token: store.token });
    } catch (error) {
      failed += list.length;
      logger.error("Blob cleanup failed — uploaded files may remain in storage", {
        ...context,
        store: store.access,
        count: list.length,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  failed = Math.min(failed, targets.length);
  if (failed < targets.length) {
    logger.info("Deleted uploaded files from storage", { ...context, count: targets.length - failed });
  }
  return { attempted: targets.length, failed };
}

// The only folder the app itself uploads answer sheets into (see
// /api/uploads, which refuses any other pathname). The reaper never looks
// outside it, so nothing else in the store can be touched by it.
export const UPLOAD_PREFIX = "answer-sheets/";

// The browser uploads straight to Blob BEFORE POST /api/evaluations checks
// quota, size, page count and file type. Every rejected or abandoned upload
// therefore left a student's answer sheet in public storage with no row
// pointing at it, permanently: 7 such files were found in November 2026.
// A file is only reaped once it is older than this, so an upload whose
// evaluation request is still in flight is never touched.
export const ORPHAN_UPLOAD_MIN_AGE_HOURS = 24;

/**
 * Deletes uploaded files that no evaluation references. A file counts as
 * referenced if any Evaluation row holds its URL or its pathname. Returns
 * how many were found and deleted. Listing costs one Blob "advanced
 * operation" per 1,000 files (2,000/month included on Hobby); deletes are free.
 */
export async function reapOrphanUploads(now: Date = new Date()): Promise<{ found: number; deleted: number }> {
  const stores = ownStores();
  if (stores.length === 0) {
    logger.warn("Orphan upload reaper skipped: no Blob token is set", { stage: "sweep" });
    return { found: 0, deleted: 0 };
  }

  const cutoff = now.getTime() - ORPHAN_UPLOAD_MIN_AGE_HOURS * 60 * 60 * 1000;
  const candidates: { url: string; pathname: string }[] = [];
  for (const store of stores) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: UPLOAD_PREFIX, cursor, limit: 1000, token: store.token });
      for (const b of page.blobs) {
        if (new Date(b.uploadedAt).getTime() < cutoff) candidates.push({ url: b.url, pathname: b.pathname });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }

  if (candidates.length === 0) return { found: 0, deleted: 0 };

  const refs = await prisma.evaluation.findMany({
    where: {
      OR: [
        { fileUrl: { in: candidates.map((c) => c.url) } },
        { fileKey: { in: candidates.map((c) => c.pathname) } },
      ],
    },
    select: { fileUrl: true, fileKey: true },
  });
  const referenced = new Set(refs.flatMap((r) => [r.fileUrl, r.fileKey]).filter(Boolean) as string[]);
  const orphans = candidates.filter((c) => !referenced.has(c.url) && !referenced.has(c.pathname));
  if (orphans.length === 0) return { found: 0, deleted: 0 };

  const result = await deleteBlobFiles(
    orphans.map((o) => ({ fileUrl: o.url, fileKey: null })),
    { stage: "sweep", reason: "orphan-upload" }
  );
  return { found: orphans.length, deleted: result.attempted - result.failed };
}
