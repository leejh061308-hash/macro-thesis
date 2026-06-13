"use client";

import { useEffect, useState } from "react";
import AdvancedQuantPanel from "./AdvancedQuantPanel";
import StrategyDetailPanel from "./StrategyDetailPanel";
import StrategyOverviewPanel from "./StrategyOverviewPanel";
import ViewModeToggle from "./ViewModeToggle";
import { useQuantFavorites } from "@/hooks/useQuantFavorites";
import { useQuantViewMode } from "@/hooks/useQuantViewMode";
import type {
  FactorWeights,
  MultiFactorStrategyId,
  StrategyId,
  UniverseId,
} from "@/lib/quant/types";

export default function QuantPanel() {
  const { mode, setMode, hydrated } = useQuantViewMode();
  const [selectedStrategyId, setSelectedStrategyId] = useState<StrategyId | null>(
    null
  );
  const [advancedStrategyId, setAdvancedStrategyId] =
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
    fetch("/api/quant/strategies/overview")
      .then((res) => res.json())
      .then((data) => setMetricsWarning(!data.metricsAvailable))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === "advanced") setSelectedStrategyId(null);
  }, [mode]);

  if (!hydrated) {
    return <div className="h-24 animate-pulse rounded-xl bg-surface-border/30" />;
  }

  const isBasic = mode === "basic";

  return (
    <div className="space-y-4">
      <ViewModeToggle mode={mode} onChange={setMode} />

      {metricsWarning && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] text-accent">
          FINNHUB_API_KEY가 설정되지 않았습니다. Railway/서버 환경 변수를
          확인해주세요.
        </div>
      )}

      {isBasic ? (
        selectedStrategyId ? (
          <StrategyDetailPanel
            strategyId={selectedStrategyId}
            onBack={() => setSelectedStrategyId(null)}
            favoriteTickers={favorites.tickers}
            onToggleFavorite={toggleTicker}
          />
        ) : (
          <StrategyOverviewPanel onSelectStrategy={setSelectedStrategyId} />
        )
      ) : (
        <AdvancedQuantPanel
          strategyId={advancedStrategyId}
          onStrategyIdChange={setAdvancedStrategyId}
          weights={weights}
          onWeightsChange={setWeights}
          universeId={universeId}
          onUniverseChange={setUniverseId}
          selectedTicker={selectedTicker}
          onSelectStock={setSelectedTicker}
          favoriteTickers={favorites.tickers}
          onToggleFavorite={toggleTicker}
        />
      )}

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
