import type { Metadata } from "next";
import Script from "next/script";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Alexei Docs — Telegram",
  description: "Создание инвойсов через Telegram",
};

export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-[var(--tg-theme-bg-color,#1a1a1a)] text-[var(--tg-theme-text-color,#ffffff)]">
        {children}
      </body>
    </html>
  );
}
