import { NextRequest, NextResponse } from "next/server";
import { readFile, mkdir } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { v4 as uuid } from "uuid";

const execFileAsync = promisify(execFile);

// Telegram PDF generation endpoint — called by the bot
export async function POST(req: NextRequest) {
  try {
    const { filePath, fieldValues } = await req.json();

    if (!filePath || !fieldValues) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Resolve input file path
    const inputPath = path.join(process.cwd(), filePath);
    if (!inputPath.startsWith(path.join(process.cwd(), "uploads"))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Build replacement map
    const replacements: Record<string, string> = {};
    for (const [key, value] of Object.entries(fieldValues)) {
      if (value != null && String(value).trim() !== "") {
        if (key.startsWith("{{")) {
          replacements[key] = String(value);
        } else {
          replacements[`{{${key}}}`] = String(value);
        }
      }
    }

    // Output path
    const outputDir = path.join(process.cwd(), "uploads", "generated");
    await mkdir(outputDir, { recursive: true });
    const outputFileName = `${uuid()}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    // Call Python script
    const scriptPath = path.join(process.cwd(), "scripts", "pdf_replace.py");
    const replacementsJson = JSON.stringify(replacements);

    const { stdout, stderr } = await execFileAsync("python3", [
      scriptPath,
      inputPath,
      outputPath,
      replacementsJson,
    ], { timeout: 30000 });

    if (stderr) {
      console.error("Telegram PDF generation stderr:", stderr);
    }
    if (stdout) {
      console.log("Telegram PDF generation result:", stdout);
    }

    // Read and return PDF
    const pdfBuffer = await readFile(outputPath);

    // Clean up
    import("fs/promises").then(({ unlink }) => unlink(outputPath).catch(() => {}));

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=document.pdf",
      },
    });
  } catch (error) {
    console.error("Telegram PDF generation error:", error);
    return NextResponse.json(
      { error: "Ошибка генерации PDF" },
      { status: 500 }
    );
  }
}
