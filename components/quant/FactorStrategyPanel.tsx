"use client";

import { useEffect, useState } from "react";
import type { QuantViewMode } from "@/lib/quant/basic-view";
import type {
  FactorId,
  FactorWeights,
  MultiFactorStrategyDefinition,
  MultiFactorStrategyId,
  UniverseId,
} from "@/lib/quant/types";
import { FACTOR_LABELS } from "@/lib/quant/factors";

const UNIVERSE_OPTIONS: { value: UniverseId; label: string; shortLabel: string }[] = [
  { value: "combined", label: "S&P500 + Nasdaq100", shortLabel: "통합" },
  { value: "sp500", label: "S&P 500", shortLabel: "S&P500" },
  { value: "nasdaq100", label: "Nasdaq 100", shortLabel: "Nasdaq100" },
];

interface FactorStrategyPanelProps {
  viewMode: QuantViewMode;
  strategies: MultiFactorStrategyDefinition[];
  selectedId: MultiFactorStrategyId | "custom";
  onSelectStrategy: (id: MultiFactorStrategyId | "custom") => void;
  weights: FactorWeights;
  onWeightsChange: (weights: FactorWeights) => void;
  universeId: UniverseId;
  onUniverseChange: (id: UniverseId) => void;
  strategyShortName: string;
}

export default function FactorStrategyPanel({
  viewMode,
  strategies,
  selectedId,
  onSelectStrategy,
  weights,
  onWeightsChange,
  universeId,
  onUniverseChange,
  strategyShortName,
}: FactorStrategyPanelProps) {
  const [customMode, setCustomMode] = useState(selectedId === "custom");
  const isBasic = viewMode === "basic";

  useEffect(() => {
    if (selectedId !== "custom") {
      const strategy = strategies.find((s) => s.id === selectedId);
      if (strategy) onWeightsChange(strategy.defaultWeights);
      setCustomMode(false);
    }
  }, [selectedId, strategies, onWeightsChange]);

  const handleWeightChange = (factor: FactorId, value: number) => {
    onSelectStrategy("custom");
    setCustomMode(true);
    onWeightsChange({ ...weights, [factor]: value });
  };

  const totalWeight = Object.values(weights).reduce((s, w) => s + (w ?? 0), 0);
  const selectedStrategy = strategies.find((s) => s.id === selectedId);

  return (
    <div className="space-y-4 rounded-card bg-surface-card p-4 shadow-card">
      <div>
        <h3 className="text-sm font-bold text-white">
          {isBasic ? "추천 전략" : "멀티팩터 전략"}
        </h3>
        <p className="text-[10px] text-neutral">
          {isBasic
            ? "현재 선택된 투자 전략과 추천 방향"
            : "Percentile Rank 기반 · 유니버스 내 상대 평가"}
        </p>
      </div>

      {isBasic ? (
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
          <p className="text-xs font-semibold text-accent">{strategyShortName}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            {selectedStrategy?.aiSummary ??
              "선택한 전략에 맞는 종목을 유니버스 내에서 선별합니다."}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {UNIVERSE_OPTIONS.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => onUniverseChange(u.value)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  universeId === u.value
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "text-neutral border border-surface-border"
                }`}
              >
                {u.shortLabel}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {UNIVERSE_OPTIONS.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => onUniverseChange(u.value)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  universeId === u.value
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "text-neutral border border-surface-border"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {strategies.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelectStrategy(s.id);
                  setCustomMode(false);
                }}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedId === s.id && !customMode
                    ? "border-accent/40 bg-accent/10"
                    : "border-surface-border hover:border-accent/20"
                }`}
              >
                <span className="font-mono text-accent text-xs">{s.icon}</span>
                <p className="mt-1 text-xs font-semibold text-white">{s.shortName}</p>
                <p className="mt-0.5 text-[10px] text-neutral line-clamp-2">
                  {s.description}
                </p>
              </button>
            ))}
          </div>

          {selectedId !== "custom" && !customMode && selectedStrategy && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
              <p className="text-[11px] leading-relaxed text-gray-300">
                {selectedStrategy.aiSummary}
              </p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300">팩터 가중치</p>
              <span className="text-[10px] text-neutral">합계 {totalWeight}%</span>
            </div>
            <div className="space-y-3">
              {(Object.keys(FACTOR_LABELS) as FactorId[]).map((factor) => (
                <div key={factor}>
                  <div className="mb-1 flex justify-between text-[10px]">
                    <span className="text-gray-400">{FACTOR_LABELS[factor].name}</span>
                    <span className="font-mono text-accent">{weights[factor] ?? 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={weights[factor] ?? 0}
                    onChange={(e) =>
                      handleWeightChange(factor, Number(e.target.value))
                    }
                    className="w-full accent-accent"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isBasic && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {strategies.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelectStrategy(s.id);
                setCustomMode(false);
              }}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                selectedId === s.id && !customMode
                  ? "border-accent/40 bg-accent/10"
                  : "border-surface-border hover:border-accent/20"
              }`}
            >
              <p className="text-xs font-semibold text-white">{s.shortName}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
