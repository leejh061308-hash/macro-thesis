"use client";

import { useState } from "react";
import type { TimingBreakdown, TimingScoreResult } from "@/lib/timing/types";

interface TimingPanelProps {
  ticker: string;
  timing: TimingScoreResult;
}

export default function TimingPanel({ ticker, timing }: TimingPanelProps) {
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiInterpret = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(
        `/api/timing/${encodeURIComponent(ticker)}/interpret`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiInterpretation(data.interpretation);
    } catch (e) {
      setAiInterpretation(
        e instanceof Error ? e.message : "AI 해석을 불러오지 못했습니다."
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <BreakdownGrid breakdown={timing.breakdown} />

      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
        <p className="text-[11px] font-semibold text-accent mb-1.5">해석</p>
        <p className="text-xs leading-relaxed text-gray-300">
          {aiInterpretation ?? timing.interpretation}
        </p>
        {!aiInterpretation && (
          <button
            type="button"
            onClick={handleAiInterpret}
            disabled={aiLoading}
            className="mt-3 w-full rounded-lg border border-accent/30 py-2 text-[11px] font-semibold text-accent disabled:opacity-50"
          >
            {aiLoading ? "AI 상세 해석 생성 중..." : "AI 상세 해석 보기"}
          </button>
        )}
      </div>

      {timing.priorScore30d != null && timing.scoreChange30d != null && (
        <p className="text-[11px] text-neutral">
          30일 전 {timing.priorScore30d}점 → 현재 {timing.timingScore}점 (
          {timing.scoreChange30d >= 0 ? "+" : ""}
          {timing.scoreChange30d})
        </p>
      )}
    </div>
  );
}

function BreakdownGrid({ breakdown }: { breakdown: TimingBreakdown }) {
  const items = [
    { label: "밸류에이션", value: breakdown.valuation, weight: "30%" },
    { label: "모멘텀", value: breakdown.momentum, weight: "25%" },
    { label: "과열도", value: breakdown.overheating, weight: "20%" },
    { label: "변동성", value: breakdown.volatility, weight: "10%" },
    { label: "거시 적합성", value: breakdown.macro, weight: "15%" },
  ];

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <p className="mb-3 text-xs font-semibold text-gray-300">진입 점수 구성</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-[11px]">
              <span className="text-neutral">
                {item.label}{" "}
                <span className="text-gray-600">({item.weight})</span>
              </span>
              <span className="font-mono text-white">{item.value}점</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-border">
              <div
                className="h-full rounded-full bg-accent/70"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
