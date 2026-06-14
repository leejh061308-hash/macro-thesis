"use client";

import FactorBacktestPanel from "./FactorBacktestPanel";
import FactorHeatmapVisual from "./FactorHeatmapVisual";
import FactorRadarChart from "./FactorRadarChart";
import FactorStrategyPanel from "./FactorStrategyPanel";
import RankingPanel from "./RankingPanel";
import { MULTI_FACTOR_STRATEGIES } from "@/lib/quant/multi-factor";
import type {
  FactorWeights,
  MultiFactorStrategyId,
  UniverseId,
} from "@/lib/quant/types";

interface AdvancedQuantPanelProps {
  strategyId: MultiFactorStrategyId | "custom";
  onStrategyIdChange: (id: MultiFactorStrategyId | "custom") => void;
  weights: FactorWeights;
  onWeightsChange: (weights: FactorWeights) => void;
  universeId: UniverseId;
  onUniverseChange: (id: UniverseId) => void;
  selectedTicker: string | null;
  onSelectStock: (ticker: string | null) => void;
  favoriteTickers: string[];
  onToggleFavorite: (ticker: string) => void;
}

export default function AdvancedQuantPanel({
  strategyId,
  onStrategyIdChange,
  weights,
  onWeightsChange,
  universeId,
  onUniverseChange,
  selectedTicker,
  onSelectStock,
  favoriteTickers,
  onToggleFavorite,
}: AdvancedQuantPanelProps) {
  const strategyName =
    strategyId === "custom"
      ? "커스텀 멀티팩터"
      : (MULTI_FACTOR_STRATEGIES.find((s) => s.id === strategyId)?.name ??
        "All Factor");

  const strategyShortName =
    strategyId === "custom"
      ? "커스텀"
      : (MULTI_FACTOR_STRATEGIES.find((s) => s.id === strategyId)?.shortName ??
        "올팩터");

  return (
    <div className="space-y-5">
      <div className="rounded-card bg-gradient-to-br from-accent-secondary/10 to-accent/5 p-4 shadow-card">
        <p className="text-xs font-semibold text-accent-secondary">전문가 모드</p>
        <p className="mt-1 text-sm text-text-secondary">
          멀티팩터 분석 · 시각화 중심 퀀트 연구
        </p>
      </div>

      <div className="grid gap-4">
        <FactorHeatmapVisual universeId={universeId} />
        <FactorRadarChart weights={weights} title="현재 팩터 가중치" />
      </div>

      <FactorStrategyPanel
        viewMode="advanced"
        strategies={MULTI_FACTOR_STRATEGIES}
        selectedId={strategyId}
        onSelectStrategy={onStrategyIdChange}
        weights={weights}
        onWeightsChange={onWeightsChange}
        universeId={universeId}
        onUniverseChange={onUniverseChange}
        strategyShortName={strategyShortName}
      />

      <RankingPanel
        viewMode="advanced"
        strategyId={strategyId}
        weights={weights}
        universeId={universeId}
        strategyShortName={strategyShortName}
        onSelectStock={(t) => onSelectStock(t || null)}
        selectedTicker={selectedTicker}
        favoriteTickers={favoriteTickers}
        onToggleFavorite={onToggleFavorite}
      />

      <FactorBacktestPanel
        viewMode="advanced"
        strategyId={strategyId}
        weights={weights}
        strategyName={strategyName}
      />
    </div>
  );
}
