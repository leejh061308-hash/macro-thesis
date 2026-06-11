import type { Metadata } from "next";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "MacroLens — AI 투자 리서치",
  description: "개인 투자자를 위한 AI 투자 리서치 플랫폼",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen font-sans">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 pb-24 pt-4">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
