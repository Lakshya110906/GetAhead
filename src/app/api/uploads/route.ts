import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authOptions } from "@/lib/auth";

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
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          pathname: `answer-sheets/${userId}/${pathname}`,
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't authorize the upload. Try again." },
      { status: 400 }
    );
  }
}
