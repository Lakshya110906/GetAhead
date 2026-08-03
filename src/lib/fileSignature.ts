// Detects a file's real type from its magic bytes rather than trusting the
// extension or the client-supplied Content-Type — both are just labels the
// uploader chose and can be wrong or deliberately spoofed.

export type DetectedFileType = "application/pdf" | "image/png" | "image/jpeg" | null;

function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

export function detectFileType(bytes: Uint8Array): DetectedFileType {
  // PDF: "%PDF-" (the spec allows up to 1024 bytes of leading garbage, but
  // in practice every real-world producer writes it at byte 0).
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";

  // PNG: fixed 8-byte signature.
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";

  // JPEG: SOI marker 0xFFD8, immediately followed by an APPn/JFIF/EXIF marker.
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";

  return null;
}

/** Throws if the file's real (magic-byte) type doesn't match what was claimed. */
export function assertDeclaredTypeMatches(bytes: Uint8Array, declaredType: string): void {
  const actual = detectFileType(bytes);
  if (!actual) {
    throw new Error("The uploaded file isn't a recognizable PDF, PNG, or JPEG (checked by content, not by file name).");
  }
  if (actual !== declaredType) {
    throw new Error(
      `The uploaded file's actual content is ${actual}, not ${declaredType} as declared. Re-upload the original file.`
    );
  }
}
