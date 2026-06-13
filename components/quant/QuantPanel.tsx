"use client";

import { useEffect, useState } from "react";
import AdvancedQuantPanel from "./AdvancedQuantPanel";
import StrategyDetailPanel from "./StrategyDetailPanel";
import StrategyOverviewPanel from "./StrategyOverviewPanel";
import TodaysOpportunities from "@/components/timing/TodaysOpportunities";
import { useQuantFavorites } from "@/hooks/useQuantFavorites";
import type { QuantViewMode } from "@/lib/quant/basic-view";
import type {
  FactorWeights,
  MultiFactorStrategyId,
  StrategyId,
  UniverseId,
} from "@/lib/quant/types";

interface QuantPanelProps {
  mode: QuantViewMode;
  modeHydrated: boolean;
}

export default function QuantPanel({ mode, modeHydrated }: QuantPanelProps) {
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
  const [finnhubConfigured, setFinnhubConfigured] = useState(true);

  const { favorites, toggleTicker } = useQuantFavorites();

  useEffect(() => {
    fetch("/api/quant/strategies/overview")
      .then((res) => res.json())
      .then((data) => setFinnhubConfigured(data.metricsAvailable !== false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === "advanced") setSelectedStrategyId(null);
  }, [mode]);

  if (!modeHydrated) {
    return <div className="h-24 animate-pulse rounded-xl bg-surface-border/30" />;
  }

  const isBasic = mode === "basic";

  return (
    <div className="space-y-4">
      {!finnhubConfigured && (
        <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-[11px] text-neutral">
          Finnhub API 키가 없어 Yahoo Finance로 재무 데이터를 보완합니다. 일부
          지표가 누락될 수 있습니다.
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
          <>
            <TodaysOpportunities />
            <StrategyOverviewPanel onSelectStrategy={setSelectedStrategyId} />
          </>
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
