"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", icon: "⌂" },
  { href: "/stocks", label: "관심", icon: "◈" },
  { href: "/quant", label: "퀀트", icon: "◆" },
  { href: "/analyze", label: "AI", icon: "◎" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-border bg-surface-raised/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-stretch px-1">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition-all duration-200 ${
                isActive ? "text-accent" : "text-muted hover:text-text-secondary"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-base leading-none transition-all ${
                  isActive ? "bg-accent/15" : ""
                }`}
              >
                {tab.icon}
              </span>
              <span className="font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
