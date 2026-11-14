import { get, type BlobAccessType } from "@vercel/blob";

// Answer sheets were uploaded to a PUBLIC Blob store: anyone holding a
// file's URL could open it, no session needed. New uploads now go to a
// private store when one is connected (env PRIVATE_BLOB_READ_WRITE_TOKEN,
// connected with the "PRIVATE_" env prefix so the SDK's default
// BLOB_READ_WRITE_TOKEN keeps pointing at the old public store). Files
// already in the public store stay readable there until retention removes
// them. Every call passes its token explicitly, which the SDK prefers over
// any env var, so the two stores can never be confused.

export interface BlobStore {
  access: BlobAccessType;
  token: string;
  host: string;
}

// "vercel_blob_rw_<storeId>_<secret>" -> "<storeid>.<access>.blob.vercel-storage.com"
function storeFor(token: string | undefined, access: BlobAccessType): BlobStore | null {
  const storeId = token?.split("_")[3];
  if (!token || !storeId) return null;
  return { access, token, host: `${storeId.toLowerCase()}.${access}.blob.vercel-storage.com` };
}

export function privateStore(): BlobStore | null {
  return storeFor(process.env.PRIVATE_BLOB_READ_WRITE_TOKEN, "private");
}

export function publicStore(): BlobStore | null {
  return storeFor(process.env.BLOB_READ_WRITE_TOKEN, "public");
}

/** Where new uploads go: the private store once it's connected. */
export function uploadStore(): BlobStore | null {
  return privateStore() ?? publicStore();
}

/** Every store this deployment owns, private first. */
export function ownStores(): BlobStore[] {
  return [privateStore(), publicStore()].filter((s): s is BlobStore => s !== null);
}

/** The store a URL belongs to, or null if it isn't one of ours. */
export function storeForUrl(url: string): BlobStore | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return ownStores().find((s) => s.host === parsed.hostname) ?? null;
}

/**
 * Reads one of our own uploaded files. Private files need the store's token
 * on the request; a plain fetch() of a private URL is refused.
 */
export async function readOwnBlob(url: string): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; status: number }> {
  const store = storeForUrl(url);
  if (!store) return { ok: false, status: 400 };
  if (store.access === "public") {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, bytes: new Uint8Array(await res.arrayBuffer()) };
  }
  const result = await get(url, { access: "private", token: store.token, useCache: false });
  if (!result || result.statusCode !== 200) return { ok: false, status: 404 };
  return { ok: true, bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()) };
}
