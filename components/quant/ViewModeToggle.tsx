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
    description: "투자 아이디어 · 전략 · TOP 10",
    icon: "◈",
  },
  {
    id: "advanced",
    label: "고급",
    description: "멀티팩터 · 시각화 · 백테스트",
    icon: "◆",
  },
];

export default function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-card bg-surface-card p-1 shadow-card">
      {MODES.map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-[12px] px-3 py-3 text-left transition-all duration-200 ${
              active
                ? item.id === "advanced"
                  ? "bg-accent-secondary/20 shadow-card"
                  : "bg-accent/15 shadow-card"
                : "hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-lg ${
                  active
                    ? item.id === "advanced"
                      ? "text-accent-secondary"
                      : "text-accent"
                    : "text-muted"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-sm font-bold ${
                  active ? "text-text" : "text-text-secondary"
                }`}
              >
                {item.label}
              </span>
            </div>
            <p
              className={`mt-1 text-[10px] leading-snug ${
                active ? "text-text-secondary" : "text-muted"
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
