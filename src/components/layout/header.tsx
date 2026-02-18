"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl px-4 lg:px-6">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6200] to-[#CC4E00]">
          <span className="text-xs font-bold text-white">A</span>
        </div>
        <span className="text-sm font-semibold text-neutral-100">
          Alexei Docs
        </span>
      </div>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <User className="h-4 w-4 text-neutral-400" />
            <span className="text-sm text-neutral-300">
              {session.user.name}
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {session.user.role === "ADMIN" ? "Админ" : "Менеджер"}
          </Badge>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
