import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { auth } from "@/lib/auth";

const execFileAsync = promisify(execFile);

// Diagnostic endpoint: show what text PyMuPDF extracts from a PDF
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { filePath } = await req.json();
    const inputPath = path.join(process.cwd(), filePath);

    const { stdout } = await execFileAsync("python3", [
      "-c",
      `
import fitz, json, sys

doc = fitz.open("${inputPath}")
result = {"pages": []}

for i in range(len(doc)):
    page = doc[i]
    page_info = {
        "page": i + 1,
        "full_text": page.get_text(),
        "spans": []
    }
    blocks = page.get_text("dict")["blocks"]
    for block in blocks:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "")
                if text.strip():
                    page_info["spans"].append({
                        "text": text,
                        "chars": [f"U+{ord(c):04X} ({c})" for c in text],
                        "font": span.get("font", ""),
                        "size": span.get("size", 0),
                        "bbox": list(span.get("bbox", [])),
                    })
    result["pages"].append(page_info)

doc.close()
print(json.dumps(result, ensure_ascii=False, indent=2))
`,
    ], { timeout: 15000 });

    return NextResponse.json(JSON.parse(stdout));
  } catch (error) {
    console.error("Diagnostic error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
