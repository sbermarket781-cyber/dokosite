import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import zlib from "zlib";
import { auth } from "@/lib/auth";

// Replace {{placeholder}} text inside PDF content streams
async function replacePlaceholdersInPdf(
  pdfBuffer: Buffer,
  replacements: Record<string, string>
): Promise<Buffer> {
  // Work with the raw PDF bytes
  // Strategy: find all stream/endstream blocks, decompress FlateDecode ones,
  // replace placeholder text, recompress, and update Length values

  const content = pdfBuffer.toString("binary");
  let result = content;

  // Find stream objects with their dictionaries
  // Pattern: /Length N /Filter /FlateDecode ... stream\n...\nendstream
  const streamRegex = /\/Length\s+(\d+)([\s\S]*?)stream\r?\n([\s\S]*?)\r?\nendstream/g;

  const replacementEntries = Object.entries(replacements).filter(
    ([, v]) => v != null && String(v).trim() !== ""
  );

  if (replacementEntries.length === 0) {
    return pdfBuffer;
  }

  let offset = 0;
  let modified = false;
  const parts: string[] = [];
  let lastIndex = 0;

  // Process each stream
  let match;
  while ((match = streamRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const lengthStr = match[1];
    const dictPart = match[2];
    const streamData = match[3];
    const matchStart = match.index;

    const isFlateDecode = dictPart.includes("/FlateDecode") ||
      content.substring(Math.max(0, matchStart - 200), matchStart).includes("/FlateDecode");

    let decompressed: string | null = null;
    let streamModified = false;

    if (isFlateDecode) {
      try {
        const compressedBuf = Buffer.from(streamData, "binary");
        const decompressedBuf = zlib.inflateSync(compressedBuf);
        decompressed = decompressedBuf.toString("binary");
      } catch {
        continue; // Skip streams that can't be decompressed
      }
    } else {
      decompressed = streamData;
    }

    if (!decompressed) continue;

    // Try replacements
    let modifiedStream = decompressed;
    for (const [key, value] of replacementEntries) {
      // Try the placeholder as-is (works for ASCII and some encodings)
      if (modifiedStream.includes(key)) {
        modifiedStream = modifiedStream.split(key).join(String(value));
        streamModified = true;
      }

      // Also try UTF-8 encoded version
      const keyUtf8 = Buffer.from(key, "utf-8").toString("binary");
      const valueUtf8 = Buffer.from(String(value), "utf-8").toString("binary");
      if (keyUtf8 !== key && modifiedStream.includes(keyUtf8)) {
        modifiedStream = modifiedStream.split(keyUtf8).join(valueUtf8);
        streamModified = true;
      }
    }

    if (streamModified) {
      modified = true;
      let newStreamData: string;
      let newLength: number;

      if (isFlateDecode) {
        const recompressed = zlib.deflateSync(
          Buffer.from(modifiedStream, "binary")
        );
        newStreamData = recompressed.toString("binary");
        newLength = recompressed.length;
      } else {
        newStreamData = modifiedStream;
        newLength = Buffer.byteLength(modifiedStream, "binary");
      }

      // Rebuild the stream block with updated Length
      const newBlock = `/Length ${newLength}${dictPart}stream\n${newStreamData}\nendstream`;

      parts.push(content.substring(lastIndex, matchStart));
      parts.push(newBlock);
      lastIndex = matchStart + fullMatch.length;
    }
  }

  if (!modified) {
    return pdfBuffer;
  }

  parts.push(content.substring(lastIndex));
  return Buffer.from(parts.join(""), "binary");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { filePath, fieldValues } = await req.json();

    if (!filePath || !fieldValues) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Resolve file path safely
    const resolvedPath = path.join(process.cwd(), filePath);
    if (!resolvedPath.startsWith(path.join(process.cwd(), "uploads"))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const pdfBuffer = await readFile(resolvedPath);

    // Build replacement map from fieldValues
    const replacements: Record<string, string> = {};
    for (const [key, value] of Object.entries(fieldValues)) {
      if (value != null && String(value).trim() !== "") {
        replacements[key] = String(value);
        // Also add without braces in case the key doesn't include them
        if (!key.startsWith("{{")) {
          replacements[`{{${key}}}`] = String(value);
        }
      }
    }

    const modifiedPdf = await replacePlaceholdersInPdf(pdfBuffer, replacements);

    return new NextResponse(modifiedPdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=document.pdf",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Ошибка генерации PDF" },
      { status: 500 }
    );
  }
}
