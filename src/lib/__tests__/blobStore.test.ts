import { describe, it, expect, vi, beforeEach } from "vitest";

// New uploads must land in the private store once it's connected, and only
// URLs in one of our own stores may be read or graded.

vi.mock("@vercel/blob", () => ({ get: vi.fn() }));

const mocked = <T>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

describe("blobStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_PubStore_pubsecret";
    delete process.env.PRIVATE_READ_WRITE_TOKEN;
  });

  it("uploads to the public store until a private one is connected, then to the private one", async () => {
    const { uploadStore } = await import("@/lib/blobStore");
    expect(uploadStore()).toMatchObject({ access: "public", host: "pubstore.public.blob.vercel-storage.com" });

    process.env.PRIVATE_READ_WRITE_TOKEN = "vercel_blob_rw_PrivStore_privsecret";
    expect(uploadStore()).toMatchObject({
      access: "private",
      host: "privstore.private.blob.vercel-storage.com",
      token: "vercel_blob_rw_PrivStore_privsecret",
    });
  });

  it("recognises only https URLs in our own stores", async () => {
    process.env.PRIVATE_READ_WRITE_TOKEN = "vercel_blob_rw_PrivStore_privsecret";
    const { storeForUrl } = await import("@/lib/blobStore");
    expect(storeForUrl("https://pubstore.public.blob.vercel-storage.com/answer-sheets/u/a.pdf")?.access).toBe("public");
    expect(storeForUrl("https://privstore.private.blob.vercel-storage.com/answer-sheets/u/a.pdf")?.access).toBe("private");
    expect(storeForUrl("https://other.public.blob.vercel-storage.com/answer-sheets/u/a.pdf")).toBeNull();
    expect(storeForUrl("http://pubstore.public.blob.vercel-storage.com/answer-sheets/u/a.pdf")).toBeNull();
    expect(storeForUrl("https://169.254.169.254/latest")).toBeNull();
    expect(storeForUrl("not a url")).toBeNull();
  });

  it("reads a private file with the store's token instead of a plain fetch", async () => {
    process.env.PRIVATE_READ_WRITE_TOKEN = "vercel_blob_rw_PrivStore_privsecret";
    const blob = await import("@vercel/blob");
    mocked(blob.get).mockResolvedValue({ statusCode: 200, stream: new Response("PDF").body });
    const { readOwnBlob } = await import("@/lib/blobStore");

    const url = "https://privstore.private.blob.vercel-storage.com/answer-sheets/u/a.pdf";
    const res = await readOwnBlob(url);

    expect(mocked(blob.get).mock.calls[0]).toEqual([url, expect.objectContaining({ access: "private", token: "vercel_blob_rw_PrivStore_privsecret" })]);
    expect(res.ok && new TextDecoder().decode(res.bytes)).toBe("PDF");
  });

  it("never fetches a URL outside our stores", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { readOwnBlob } = await import("@/lib/blobStore");
    expect(await readOwnBlob("https://evil.example/x.pdf")).toEqual({ ok: false, status: 400 });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
