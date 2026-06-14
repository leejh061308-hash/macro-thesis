"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBar from "@/components/search/SearchBar";

export default function AppHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const showSearch = !isHome;

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto max-w-lg px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-secondary text-sm font-bold text-white shadow-card">
              M
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-text">
                MacroLens
              </h1>
              <p className="text-[10px] text-muted">AI 투자 비서</p>
            </div>
          </Link>
          {isHome && (
            <Link
              href="/stocks"
              className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-white/10"
            >
              관심종목
            </Link>
          )}
        </div>
        {showSearch && (
          <div className="mt-3 animate-fade-in">
            <SearchBar />
          </div>
        )}
      </div>
    </header>
  );
}
