import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — документы текущего пользователя
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      include: {
        templates: {
          include: {
            template: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

// POST — создать документ (сохранить заполненные данные)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { templateIds, fieldValues, title } = await req.json();

    if (!templateIds?.length) {
      return NextResponse.json(
        { error: "Выберите хотя бы один шаблон" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        title: title || `Документ от ${new Date().toLocaleDateString("ru-RU")}`,
        fieldValues: fieldValues || {},
        templates: {
          create: templateIds.map((templateId: string) => ({
            templateId,
          })),
        },
      },
      include: {
        templates: {
          include: { template: true },
        },
      },
    });

    // Increment usage counts
    await prisma.template.updateMany({
      where: { id: { in: templateIds } },
      data: { usageCount: { increment: 1 } },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Ошибка создания документа" },
      { status: 500 }
    );
  }
}
