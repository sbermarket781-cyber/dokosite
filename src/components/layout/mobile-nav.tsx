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
} from "lucide-react";
import { motion } from "framer-motion";

interface MobileNavProps {
  role: string;
}

const managerTabs = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/documents/create", label: "Создать", icon: FilePlus },
  { href: "/cabinet", label: "Документы", icon: FolderOpen },
];

const adminTabs = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/documents/create", label: "Создать", icon: FilePlus },
  { href: "/cabinet", label: "Документы", icon: FolderOpen },
  { href: "/admin/users", label: "Админ", icon: Users },
  { href: "/admin/templates/upload", label: "Шаблоны", icon: FileStack },
  { href: "/admin/stats", label: "Стат.", icon: BarChart3 },
];

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const tabs = role === "ADMIN" ? adminTabs : managerTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-xl lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="flex-1">
              <div className="relative flex flex-col items-center gap-0.5 py-2">
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[#FF6200]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <tab.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-[#FF6200]" : "text-neutral-500"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-[#FF6200]" : "text-neutral-500"
                  )}
                >
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
