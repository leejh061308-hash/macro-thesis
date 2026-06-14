import type { ReactNode } from "react";

type PillVariant = "blue" | "purple" | "green" | "neutral";

interface PillProps {
  children: ReactNode;
  variant?: PillVariant;
  className?: string;
}

const VARIANTS: Record<PillVariant, string> = {
  blue: "bg-accent/15 text-accent",
  purple: "bg-accent-secondary/15 text-accent-secondary",
  green: "bg-bullish/15 text-bullish",
  neutral: "bg-white/5 text-text-secondary",
};

export default function Pill({
  children,
  variant = "blue",
  className = "",
}: PillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
