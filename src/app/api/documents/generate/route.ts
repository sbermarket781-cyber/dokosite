import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth";

const execFileAsync = promisify(execFile);

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

    // Resolve input file path safely
    const inputPath = path.join(process.cwd(), filePath);
    if (!inputPath.startsWith(path.join(process.cwd(), "uploads"))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Build replacement map — ensure keys have {{...}} format
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

    // Output path for the generated PDF
    const outputDir = path.join(process.cwd(), "uploads", "generated");
    const outputFileName = `${uuid()}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    // Call Python script for reliable PDF text replacement
    const scriptPath = path.join(process.cwd(), "scripts", "pdf_replace.py");
    const replacementsJson = JSON.stringify(replacements);

    const { stdout, stderr } = await execFileAsync("python3", [
      scriptPath,
      inputPath,
      outputPath,
      replacementsJson,
    ], { timeout: 30000 });

    if (stderr) {
      console.error("PDF generation stderr:", stderr);
    }

    // Read the generated PDF
    const pdfBuffer = await readFile(outputPath);

    // Clean up generated file
    unlink(outputPath).catch(() => {});

    return new NextResponse(new Uint8Array(pdfBuffer), {
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
