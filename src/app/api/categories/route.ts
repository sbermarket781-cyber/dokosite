import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — список категорий с количеством шаблонов
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { templates: true },
        },
      },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Ошибка получения категорий" },
      { status: 500 }
    );
  }
}

// POST — создать категорию (только админ)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { name, icon } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Название обязательно" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "Категория с таким названием уже существует" },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.category.aggregate({ _max: { order: true } });
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        icon: icon || "FileText",
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Ошибка создания категории" },
      { status: 500 }
    );
  }
}
