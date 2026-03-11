"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { Spinner } from "@/components/ui/spinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!session) return null;

  const role = session.user.role;

  return (
    <div className="min-h-screen bg-neutral-950">
      <Sidebar role={role} />
      <div className="lg:ml-64">
        <Header />
        <main className="pb-20 lg:pb-6">{children}</main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
