import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;

    if (!file || !name || !categoryId) {
      return NextResponse.json(
        { error: "Файл, название и категория обязательны" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Только PDF файлы" },
        { status: 400 }
      );
    }

    // Save file
    const uploadsDir = path.join(process.cwd(), "uploads", "templates");
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `${uuid()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Create template record
    const template = await prisma.template.create({
      data: {
        name,
        description: description || null,
        fileName: file.name,
        filePath: `/uploads/templates/${fileName}`,
        categoryId,
      },
      include: {
        category: true,
        placeholders: true,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error uploading template:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки файла" },
      { status: 500 }
    );
  }
}
