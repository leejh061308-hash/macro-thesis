"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score: number;
  label: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

const SIZES = {
  sm: { outer: 72, stroke: 6, fontSize: "text-lg" },
  md: { outer: 96, stroke: 7, fontSize: "text-2xl" },
  lg: { outer: 120, stroke: 8, fontSize: "text-3xl" },
};

export default function ScoreGauge({
  score,
  label,
  sublabel,
  size = "md",
}: ScoreGaugeProps) {
  const [display, setDisplay] = useState(0);
  const { outer, stroke, fontSize } = SIZES[size];
  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const color = scoreColor(score);

  useEffect(() => {
    const start = performance.now();
    const duration = 600;
    let frame: number;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(score * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: outer, height: outer }}>
        <svg width={outer} height={outer} className="-rotate-90">
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.15)"
            strokeWidth={stroke}
          />
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-semibold text-text ${fontSize}`}>{display}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-text-secondary">{label}</p>
        {sublabel && (
          <p className="mt-0.5 text-[10px] font-medium" style={{ color }}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}
