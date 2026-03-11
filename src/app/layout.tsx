import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Alexei Docs — Система документооборота",
  description: "Внутренний сервис быстрого заполнения легальных документов",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-neutral-950 text-neutral-100`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
