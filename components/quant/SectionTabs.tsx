"use client";

import type { QuantSection } from "@/lib/quant/types";

const SECTIONS: { id: QuantSection; label: string }[] = [
  { id: "strategy", label: "전략" },
  { id: "ranking", label: "랭킹" },
  { id: "screener", label: "스크리너" },
];

interface SectionTabsProps {
  active: QuantSection;
  onChange: (section: QuantSection) => void;
}

export default function SectionTabs({ active, onChange }: SectionTabsProps) {
  return (
    <div className="flex gap-2 rounded-xl border border-surface-border bg-surface-card p-1">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
            active === s.id
              ? "bg-accent/20 text-accent border border-accent/30"
              : "text-neutral hover:text-white"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
