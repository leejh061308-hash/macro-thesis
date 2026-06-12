"use client";

import type { TimingScoreResult } from "@/lib/timing/types";

const COLOR_MAP = {
  accent: "text-accent border-accent/30 bg-accent/10",
  bullish: "text-bullish border-bullish/30 bg-bullish/10",
  neutral: "text-neutral border-surface-border bg-surface-card",
  bearish: "text-bearish border-bearish/30 bg-bearish/10",
};

interface ScoreCardsProps {
  timing: TimingScoreResult;
}

export default function ScoreCards({ timing }: ScoreCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
        <p className="text-[11px] text-neutral">기업 점수</p>
        <p className="mt-1 font-mono text-3xl font-bold text-white">
          {timing.companyScore}
          <span className="ml-1 text-sm font-normal text-neutral">점</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-accent">
          {timing.companyLabel}
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
          기업의 질 · 재무·경쟁력
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 card-glow ${COLOR_MAP[timing.timingColor]}`}
      >
        <p className="text-[11px] opacity-80">진입 점수</p>
        <p className="mt-1 font-mono text-3xl font-bold">
          {timing.timingScore}
          <span className="ml-1 text-sm font-normal opacity-70">점</span>
        </p>
        <p className="mt-1 text-xs font-semibold">{timing.timingLabel}</p>
        <p className="mt-2 text-[10px] leading-relaxed opacity-70">
          현재 진입 매력도
        </p>
      </div>
    </div>
  );
}
