"use client";

import { useEffect, useState } from "react";
import FactorBacktestPanel from "./FactorBacktestPanel";
import FactorStrategyPanel from "./FactorStrategyPanel";
import RankingPanel from "./RankingPanel";
import ViewModeToggle from "./ViewModeToggle";
import { useQuantFavorites } from "@/hooks/useQuantFavorites";
import { useQuantViewMode } from "@/hooks/useQuantViewMode";
import { MULTI_FACTOR_STRATEGIES } from "@/lib/quant/multi-factor";
import type {
  FactorWeights,
  MultiFactorStrategyId,
  UniverseId,
} from "@/lib/quant/types";

export default function QuantPanel() {
  const { mode, setMode, hydrated } = useQuantViewMode();
  const [strategyId, setStrategyId] =
    useState<MultiFactorStrategyId | "custom">("all-factor");
  const [weights, setWeights] = useState<FactorWeights>({
    value: 25,
    quality: 25,
    growth: 25,
    momentum: 25,
  });
  const [universeId, setUniverseId] = useState<UniverseId>("combined");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [metricsWarning, setMetricsWarning] = useState(false);

  const { favorites, toggleTicker } = useQuantFavorites();

  useEffect(() => {
    fetch("/api/quant/ranking?strategy=all-factor&limit=1")
      .then((res) => res.json())
      .then((data) => setMetricsWarning(!data.metricsAvailable))
      .catch(() => {});
  }, []);

  const strategyName =
    strategyId === "custom"
      ? "커스텀 멀티팩터"
      : (MULTI_FACTOR_STRATEGIES.find((s) => s.id === strategyId)?.name ??
        "All Factor");

  const strategyShortName =
    strategyId === "custom"
      ? "커스텀 전략"
      : (MULTI_FACTOR_STRATEGIES.find((s) => s.id === strategyId)?.shortName ??
        "올팩터");

  if (!hydrated) {
    return <div className="h-24 animate-pulse rounded-xl bg-surface-border/30" />;
  }

  return (
    <div className="space-y-4">
      <ViewModeToggle mode={mode} onChange={setMode} />

      {metricsWarning && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] text-accent">
          FINNHUB_API_KEY가 설정되지 않았습니다. Railway/서버 환경 변수를
          확인해주세요.
        </div>
      )}

      <FactorStrategyPanel
        viewMode={mode}
        strategies={MULTI_FACTOR_STRATEGIES}
        selectedId={strategyId}
        onSelectStrategy={setStrategyId}
        weights={weights}
        onWeightsChange={setWeights}
        universeId={universeId}
        onUniverseChange={setUniverseId}
        strategyShortName={strategyShortName}
      />

      <RankingPanel
        viewMode={mode}
        strategyId={strategyId}
        weights={weights}
        universeId={universeId}
        strategyShortName={strategyShortName}
        onSelectStock={(t) => setSelectedTicker(t || null)}
        selectedTicker={selectedTicker}
        favoriteTickers={favorites.tickers}
        onToggleFavorite={toggleTicker}
      />

      <FactorBacktestPanel
        viewMode={mode}
        strategyId={strategyId}
        weights={weights}
        strategyName={strategyName}
      />

      {favorites.tickers.length > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
          <h3 className="text-xs font-semibold text-gray-400">즐겨찾기 종목</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {favorites.tickers.map((ticker) => (
              <button
                key={ticker}
                type="button"
                onClick={() => setSelectedTicker(ticker)}
                className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
