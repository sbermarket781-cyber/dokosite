import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { login: "admin" },
    update: {},
    create: {
      login: "admin",
      passwordHash: adminPassword,
      fullName: "Администратор",
      role: "ADMIN",
    },
  });
  console.log("Admin created:", admin.login);

  // Create demo manager
  const managerPassword = await bcrypt.hash("manager123", 12);
  const manager = await prisma.user.upsert({
    where: { login: "manager" },
    update: {},
    create: {
      login: "manager",
      passwordHash: managerPassword,
      fullName: "Иванов Иван Иванович",
      role: "MANAGER",
    },
  });
  console.log("Manager created:", manager.login);

  // Create categories
  const categories = [
    { name: "Инвойсы", icon: "Receipt", order: 1 },
    { name: "Контракты", icon: "Handshake", order: 2 },
    { name: "Расписки", icon: "ScrollText", order: 3 },
    { name: "Доверенности", icon: "Shield", order: 4 },
    { name: "Разрешения на работу", icon: "Briefcase", order: 5 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log("Categories created:", categories.length);

  console.log("Seed complete!");
  console.log("");
  console.log("=== Учётные данные для входа ===");
  console.log("Админ:    login: admin    / password: admin123");
  console.log("Менеджер: login: manager  / password: manager123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
