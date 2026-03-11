import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — список шаблонов (или один шаблон по id)
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (id) {
      const template = await prisma.template.findUnique({
        where: { id },
        include: {
          category: true,
          placeholders: { orderBy: { order: "asc" } },
        },
      });

      if (!template) {
        return NextResponse.json(
          { error: "Шаблон не найден" },
          { status: 404 }
        );
      }

      return NextResponse.json(template);
    }

    const templates = await prisma.template.findMany({
      include: {
        category: true,
        placeholders: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Ошибка получения шаблонов" },
      { status: 500 }
    );
  }
}

// PATCH — обновить шаблон + плейсхолдеры (только админ)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, categoryId, placeholders } = body;

    // Update template info
    await prisma.template.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(categoryId && { categoryId }),
      },
    });

    // Update placeholders if provided
    if (placeholders && Array.isArray(placeholders)) {
      // Delete existing placeholders
      await prisma.templatePlaceholder.deleteMany({
        where: { templateId: id },
      });

      // Create new placeholders
      await prisma.templatePlaceholder.createMany({
        data: placeholders.map(
          (
            p: {
              key: string;
              label: string;
              fieldType: string;
              required: boolean;
              order: number;
              isRepeatable: boolean;
              groupName: string | null;
            },
            i: number
          ) => ({
            templateId: id,
            key: p.key,
            label: p.label,
            fieldType: p.fieldType as "TEXT" | "DATE" | "NUMBER" | "PHONE" | "EMAIL" | "TEXTAREA" | "CURRENCY",
            required: p.required ?? true,
            order: p.order ?? i,
            isRepeatable: p.isRepeatable ?? false,
            groupName: p.groupName || null,
          })
        ),
      });
    }

    const updated = await prisma.template.findUnique({
      where: { id },
      include: {
        category: true,
        placeholders: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Ошибка обновления шаблона" },
      { status: 500 }
    );
  }
}

// DELETE — удалить шаблон (только админ)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    await prisma.template.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Ошибка удаления шаблона" },
      { status: 500 }
    );
  }
}
