"use client";

import type { QuantViewMode } from "@/lib/quant/basic-view";

interface ViewModeToggleProps {
  mode: QuantViewMode;
  onChange: (mode: QuantViewMode) => void;
}

const MODES: Array<{
  id: QuantViewMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "basic",
    label: "기본",
    description: "8대 전략 카드 · TOP 10 · 백테스트",
    icon: "◈",
  },
  {
    id: "advanced",
    label: "고급",
    description: "팩터 랭킹 · 가중치 · 스크리너",
    icon: "◆",
  },
];

export default function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES.map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
              active
                ? "border-accent bg-accent/15 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                : "border-surface-border bg-surface-card hover:border-surface-border/80 hover:bg-surface-card/80"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-lg ${active ? "text-accent" : "text-neutral"}`}
              >
                {item.icon}
              </span>
              <span
                className={`text-base font-bold ${active ? "text-white" : "text-gray-300"}`}
              >
                {item.label}
              </span>
            </div>
            <p
              className={`mt-1.5 text-[11px] leading-snug ${
                active ? "text-gray-300" : "text-neutral"
              }`}
            >
              {item.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
