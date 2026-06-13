"use client";

import { useEffect, useState } from "react";
import QuantLoadingState from "./QuantLoadingState";
import { statusColor } from "@/lib/quant/strategy-overview";
import type {
  FactorHeatmapItem,
  FactorRotationItem,
  MarketAnalyticsResult,
  RotationWindow,
} from "@/lib/quant/market-analytics";
import type { StrategyOverviewItem } from "@/lib/quant/strategy-overview";
import type { UniverseId } from "@/lib/quant/types";

const ROTATION_OPTIONS: { value: RotationWindow; label: string }[] = [
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "6m", label: "6개월" },
  { value: "1y", label: "1년" },
];

interface MarketFactorDashboardProps {
  universeId: UniverseId;
}

export default function MarketFactorDashboard({
  universeId,
}: MarketFactorDashboardProps) {
  const [rotationWindow, setRotationWindow] = useState<RotationWindow>("3m");
  const [data, setData] = useState<MarketAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      rotation: rotationWindow,
      universe: universeId,
    });
    fetch(`/api/quant/market?${params}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json as MarketAnalyticsResult);
      })
      .catch((e) => {
        setData(null);
        setError(e instanceof Error ? e.message : "로드 실패");
      })
      .finally(() => setLoading(false));
  }, [rotationWindow, universeId]);

  return (
    <div className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <div>
        <h3 className="text-sm font-bold text-white">시장 팩터 분석</h3>
        <p className="text-[10px] text-neutral">
          현재 시장에서 어떤 팩터와 전략이 강한지 분석합니다
        </p>
      </div>

      {loading ? (
        <QuantLoadingState label="시장 팩터 분석 중" />
      ) : error ? (
        <p className="text-sm text-bearish">{error}</p>
      ) : data ? (
        <>
          <FactorHeatmapSection items={data.heatmap} aiSummary={data.heatmapAiSummary} />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white">팩터 로테이션</p>
              <div className="flex gap-1">
                {ROTATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRotationWindow(opt.value)}
                    className={`rounded-md px-2 py-0.5 text-[10px] ${
                      rotationWindow === opt.value
                        ? "bg-accent/20 text-accent"
                        : "text-neutral hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <FactorRotationSection
              items={data.rotation}
              aiSummary={data.rotationAiSummary}
            />
          </div>

          <StrategyStrengthSection
            strategies={data.strategies}
            aiSummary={data.strategiesAiSummary}
          />
        </>
      ) : null}
    </div>
  );
}

function FactorHeatmapSection({
  items,
  aiSummary,
}: {
  items: FactorHeatmapItem[];
  aiSummary: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-white">팩터 히트맵</p>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <div
            key={item.factor}
            className="rounded-lg border border-surface-border px-2 py-3 text-center"
            style={{
              backgroundColor: `rgba(34, 211, 238, ${item.intensity * 0.35})`,
            }}
          >
            <p className="text-[10px] text-neutral">{item.label}</p>
            <p className="font-mono text-sm font-bold text-white">{item.score}</p>
          </div>
        ))}
      </div>
      <AiInsight text={aiSummary} />
    </div>
  );
}

function FactorRotationSection({
  items,
  aiSummary,
}: {
  items: FactorRotationItem[];
  aiSummary: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.factor}
            className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2"
          >
            <span className="text-xs text-gray-300">{item.label}</span>
            <span
              className={`font-mono text-sm font-semibold ${
                item.direction === "up"
                  ? "text-bullish"
                  : item.direction === "down"
                    ? "text-bearish"
                    : "text-neutral"
              }`}
            >
              {item.direction === "up" ? "↑" : item.direction === "down" ? "↓" : "→"}
            </span>
          </div>
        ))}
      </div>
      <AiInsight text={aiSummary} />
    </div>
  );
}

function StrategyStrengthSection({
  strategies,
  aiSummary,
}: {
  strategies: StrategyOverviewItem[];
  aiSummary: string;
}) {
  const top = [...strategies]
    .filter((s) => s.suitabilityScore > 0)
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-white">전략 강도 분석</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {top.map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-surface-border px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-300">{s.shortName}</span>
              <span className="font-mono text-sm font-bold text-accent">
                {s.suitabilityScore}점
              </span>
            </div>
            <p className={`text-[10px] font-medium ${statusColor(s.statusLabel)}`}>
              {s.statusLabel}
            </p>
          </div>
        ))}
      </div>
      <AiInsight text={aiSummary} />
    </div>
  );
}

function AiInsight({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
      <p className="text-[10px] font-semibold text-accent mb-0.5">AI 해석</p>
      <p className="text-xs leading-relaxed text-gray-300">{text}</p>
    </div>
  );
}
