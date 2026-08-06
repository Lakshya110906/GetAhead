import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 30;

// Heuristic for "this isn't real prose, it's PDF/binary structure
// reinterpreted as text": real study material is mostly alphabetic
// characters in reasonably sized words with normal spacing. PDF object
// structure and compressed-stream noise reinterpreted as latin1 tends to
// have long runs of non-alphabetic symbols, PDF keywords, or very few
// actual word breaks relative to its length.
function looksLikeExtractionGarbage(text: string): boolean {
  const sample = text.slice(0, 4000);
  const pdfKeywordHits = (sample.match(/\b(endobj|endstream|xref|obj|stream|startxref|trailer)\b/g) || []).length;
  if (pdfKeywordHits >= 3) return true;

  const letters = (sample.match(/[a-zA-Z]/g) || []).length;
  const alphaRatio = letters / Math.max(1, sample.length);
  if (alphaRatio < 0.55) return true;

  const words = sample.split(/\s+/).filter(Boolean);
  const avgWordLength = words.length > 0 ? sample.length / words.length : 0;
  if (avgWordLength > 20) return true;

  return false;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "text/markdown",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    // Extract text based on file type
    let extractedText = "";
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (file.type === "text/plain" || file.type === "text/markdown" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      // Plain text: decode directly
      extractedText = new TextDecoder("utf-8").decode(bytes);
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // For PDF: extract text using a simple byte-level approach
      // (In production you'd use pdf-parse or similar, but we avoid native deps)
      const rawText = new TextDecoder("latin1").decode(bytes);
      // Extract text between BT/ET markers (PDF text streams)
      const textParts: string[] = [];
      // Method 1: BT...ET blocks
      const btEtRegex = /BT[\s\S]*?ET/g;
      const btMatches = rawText.match(btEtRegex) || [];
      for (const block of btMatches) {
        // Extract string literals
        const strRegex = /\(([^)]+)\)/g;
        let m: RegExpExecArray | null;
        while ((m = strRegex.exec(block)) !== null) {
          const decoded = m[1]
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\\(/g, "(")
            .replace(/\\\)/g, ")")
            .replace(/\\\\/g, "\\");
          if (decoded.length > 2) textParts.push(decoded);
        }
      }
      // Method 2: Tj/TJ operators
      const tjRegex = /\[([\s\S]*?)\]\s*TJ/g;
      const tjMatches = [...rawText.matchAll(tjRegex)];
      for (const m of tjMatches) {
        const inner = m[1].replace(/\(([^)]*)\)/g, "$1").replace(/<[0-9a-fA-F]+>/g, " ");
        if (inner.trim().length > 2) textParts.push(inner.trim());
      }
      
      extractedText = textParts.join(" ").replace(/\s+/g, " ").trim();
      
      // If extraction failed or got garbage, just use the raw printable chars
      if (extractedText.length < 100) {
        extractedText = rawText
          .replace(/[^\x20-\x7E\n\r\t]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 15000);
      }
    } else if (
      file.type.includes("word") ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".doc")
    ) {
      // For DOCX: XML inside zip, extract text nodes
      const rawText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      // Pull text from <w:t> elements (basic DOCX parsing)
      const wt = rawText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      extractedText = wt
        .map(t => t.replace(/<[^>]+>/g, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (extractedText.length < 50) {
        // Fallback: strip all XML
        extractedText = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 15000);
      }
    } else {
      // Try as plain text for any other type
      try {
        extractedText = new TextDecoder("utf-8").decode(bytes);
      } catch {
        return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
      }
    }

    // Trim to a reasonable context length (keep first ~8000 chars — ~2000 tokens)
    const maxChars = 8000;
    const trimmed = extractedText.slice(0, maxChars);
    const wasTrimmed = extractedText.length > maxChars;

    if (trimmed.trim().length < 20) {
      return NextResponse.json({
        error: "Could not extract readable text from this file. Please try a .txt or .md file."
      }, { status: 422 });
    }

    // The PDF/DOCX extraction above is a hand-rolled byte-level parser, not
    // a real PDF/OOXML library — it only works on legacy, uncompressed PDFs.
    // Most real-world PDFs (anything exported from Word, Google Docs, LaTeX)
    // use compressed content streams, so the regexes above find nothing and
    // fall through to "read printable bytes from the whole file," which
    // reinterprets binary/compressed data as text — indistinguishable from
    // garbage without a check like this one. Silently handing that to the
    // question generator is worse than refusing: reject it instead of
    // quietly feeding noise into the prompt.
    if ((file.type === "application/pdf" || file.name.endsWith(".pdf")) && looksLikeExtractionGarbage(trimmed)) {
      return NextResponse.json({
        error: "Couldn't reliably extract text from this PDF (it may use a compressed/scanned format this app can't parse). Please copy the text into a .txt or .md file and upload that instead.",
      }, { status: 422 });
    }

    // Check file type is in allowed list (after we've tried to extract)
    const isAllowed = allowedTypes.some(t => file.type.startsWith(t.split("/")[0])) || 
      file.name.match(/\.(txt|md|pdf|docx|doc)$/i);
    if (!isAllowed) {
      return NextResponse.json({ error: "File type not supported. Please upload PDF, TXT, DOCX, or MD files." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      text: trimmed,
      originalLength: extractedText.length,
      trimmed: wasTrimmed,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("File extraction error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
