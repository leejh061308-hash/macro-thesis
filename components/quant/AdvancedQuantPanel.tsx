"use client";

import FactorBacktestPanel from "./FactorBacktestPanel";
import FactorStrategyPanel from "./FactorStrategyPanel";
import MarketFactorDashboard from "./MarketFactorDashboard";
import PortfolioGeneratorPanel from "./PortfolioGeneratorPanel";
import RankingPanel from "./RankingPanel";
import StrategyBattlePanel from "./StrategyBattlePanel";
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
    <div className="space-y-4">
      <MarketFactorDashboard universeId={universeId} />

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

      <StrategyBattlePanel />

      <FactorBacktestPanel
        viewMode="advanced"
        strategyId={strategyId}
        weights={weights}
        strategyName={strategyName}
      />

      <PortfolioGeneratorPanel
        universeId={universeId}
        onSelectStock={(t) => onSelectStock(t)}
      />
    </div>
  );
}
