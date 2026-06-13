"use client";

import type { QuantViewMode } from "@/lib/quant/basic-view";

interface ViewModeToggleProps {
  mode: QuantViewMode;
  onChange: (mode: QuantViewMode) => void;
}

export default function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="sticky top-0 z-30 -mx-1 border-b border-surface-border bg-surface/95 px-1 py-2 backdrop-blur-md">
      <div className="flex rounded-lg border border-surface-border bg-surface-card p-0.5">
        <ToggleButton
          label="기본"
          active={mode === "basic"}
          onClick={() => onChange("basic")}
        />
        <ToggleButton
          label="고급"
          active={mode === "advanced"}
          onClick={() => onChange("advanced")}
        />
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-accent/20 text-accent shadow-sm"
          : "text-neutral hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
}
