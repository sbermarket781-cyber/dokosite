import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const [totalDocuments, totalTemplates, totalUsers, topTemplates, recentDocuments] =
      await Promise.all([
        prisma.document.count(),
        prisma.template.count(),
        prisma.user.count(),
        prisma.template.findMany({
          select: { name: true, usageCount: true },
          orderBy: { usageCount: "desc" },
          take: 10,
        }),
        prisma.document.findMany({
          select: {
            id: true,
            title: true,
            createdAt: true,
            user: { select: { fullName: true } },
            templates: { select: { id: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    return NextResponse.json({
      totalDocuments,
      totalTemplates,
      totalUsers,
      topTemplates,
      recentDocuments: recentDocuments.map((d) => ({
        id: d.id,
        title: d.title,
        createdAt: d.createdAt,
        userName: d.user.fullName,
        templateCount: d.templates.length,
      })),
      documentsPerDay: [],
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
