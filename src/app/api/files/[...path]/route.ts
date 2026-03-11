import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const filePath = path.join(process.cwd(), "uploads", ...segments);

    // Security: prevent directory traversal
    const resolved = path.resolve(filePath);
    const uploadsDir = path.resolve(path.join(process.cwd(), "uploads"));
    if (!resolved.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await readFile(resolved);

    const ext = path.extname(resolved).toLowerCase();
    const contentType =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
        ? "image/png"
        : "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }
}
