import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authOptions } from "@/lib/auth";
import { reportApiError } from "@/lib/apiError";

// Real scanned answer sheets can be large; this is the ceiling enforced both
// here (before the client is handed an upload token) and again server-side
// in POST /api/evaluations before a job is enqueued.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

const ALLOWED_CONTENT_TYPES = ["application/pdf", "image/png", "image/jpeg"];

// Handshake endpoint for @vercel/blob's client-upload flow: the browser posts
// here first to get a short-lived, scoped token, then PUTs the file bytes
// straight to Blob storage — this route never sees the file body itself.
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // This does NOT rewrite the final path — @vercel/blob's handleUpload
        // (confirmed in 2.6.1 and still in 2.8.0, the latest) spreads the
        // client's originally-requested pathname back into the token
        // AFTER this callback's return value, silently discarding whatever
        // `pathname` is returned here. The real security boundary has to be
        // a validation, not a rewrite: reject any pathname that doesn't
        // already sit under the caller's own, server-verified userId — the
        // client (src/app/upload/page.tsx) constructs that prefix itself,
        // but only this check stops it from claiming someone else's.
        const requiredPrefix = `answer-sheets/${userId}/`;
        if (!pathname.startsWith(requiredPrefix)) {
          throw new Error("Upload path must be scoped to your own account.");
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client posts the resulting blob URL to
        // POST /api/evaluations itself once the direct upload finishes.
        // (This webhook only fires on a deployed domain Vercel can reach,
        // not on localhost, so the enqueue step can't depend on it.)
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return reportApiError({ code: "UPLOAD_AUTH_FAILED", error, route: "POST /api/uploads", userId, status: 400 });
  }
}
