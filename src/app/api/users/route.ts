import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET — список пользователей (только админ)
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        login: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Ошибка получения пользователей" },
      { status: 500 }
    );
  }
}

// POST — создать пользователя (только админ)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { login, password, fullName, role } = await req.json();

    if (!login?.trim() || !password || !fullName?.trim()) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким логином уже существует" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        login: login.trim(),
        passwordHash,
        fullName: fullName.trim(),
        role: role || "MANAGER",
      },
      select: {
        id: true,
        login: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Ошибка создания пользователя" },
      { status: 500 }
    );
  }
}

// PATCH — обновить пользователя (только админ)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "ID обязателен" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.fullName !== undefined) updateData.fullName = body.fullName;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        login: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Ошибка обновления пользователя" },
      { status: 500 }
    );
  }
}
