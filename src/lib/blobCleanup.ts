import { del } from "@vercel/blob";
import { logger } from "@/lib/logger";

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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    logger.error("Blob cleanup skipped: BLOB_READ_WRITE_TOKEN is not set — uploaded files were NOT deleted from storage", {
      ...context,
      count: targets.length,
    });
    return { attempted: targets.length, failed: targets.length };
  }

  try {
    await del(targets);
    logger.info("Deleted uploaded files from storage", { ...context, count: targets.length });
    return { attempted: targets.length, failed: 0 };
  } catch (error) {
    logger.error("Blob cleanup failed — uploaded files may remain in storage", {
      ...context,
      count: targets.length,
      message: error instanceof Error ? error.message : String(error),
    });
    return { attempted: targets.length, failed: targets.length };
  }
}
