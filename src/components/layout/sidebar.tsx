"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  Users,
  FileStack,
  BarChart3,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";

interface SidebarProps {
  role: string;
}

const managerLinks = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/documents/create", label: "Новый документ", icon: FilePlus },
  { href: "/cabinet", label: "Мои документы", icon: FolderOpen },
];

const adminLinks = [
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/templates/upload", label: "Шаблоны", icon: FileStack },
  { href: "/admin/stats", label: "Статистика", icon: BarChart3 },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const links = role === "ADMIN" ? [...managerLinks, ...adminLinks] : managerLinks;

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col border-r border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-neutral-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6200] to-[#CC4E00]">
          <span className="text-sm font-bold text-white">A</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-100">Alexei Docs</p>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
            Документы
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {role === "ADMIN" && (
          <p className="px-3 py-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            Документы
          </p>
        )}
        {managerLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-white"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-[#FF6200]/10 border border-[#FF6200]/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <link.icon className={cn("h-5 w-5 relative z-10", isActive && "text-[#FF6200]")} />
                <span className="relative z-10">{link.label}</span>
              </div>
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <>
            <div className="my-3 border-t border-neutral-800" />
            <p className="px-3 py-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Администрирование
            </p>
            {adminLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-white"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-admin-active"
                        className="absolute inset-0 rounded-xl bg-[#FF6200]/10 border border-[#FF6200]/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <link.icon className={cn("h-5 w-5 relative z-10", isActive && "text-[#FF6200]")} />
                    <span className="relative z-10">{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-neutral-800 p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-400 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
