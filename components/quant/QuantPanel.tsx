"use client";

import { useEffect, useState } from "react";
import BacktestPanel from "./BacktestPanel";
import ComparePanel from "./ComparePanel";
import ScreenerSection from "./ScreenerSection";
import StrategyEntryEnvironment from "@/components/timing/StrategyEntryEnvironment";
import { useQuantFavorites } from "@/hooks/useQuantFavorites";
import type {
  CompareResult,
  StrategyDefinition,
  StrategyId,
} from "@/lib/quant/types";

export default function QuantPanel() {
  const [strategies, setStrategies] = useState<StrategyDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<StrategyId | null>("growth");
  const [compareSelection, setCompareSelection] = useState<StrategyId[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(
    null
  );
  const [compareLoading, setCompareLoading] = useState(false);
  const [metricsWarning, setMetricsWarning] = useState(false);

  const { favorites, toggleStrategy, toggleTicker } = useQuantFavorites();

  useEffect(() => {
    fetch("/api/quant/strategies")
      .then((res) => res.json())
      .then((data) => {
        setStrategies(data.strategies ?? []);
        setMetricsWarning(!data.metricsAvailable);
      })
      .catch(() => {});
  }, []);

  const handleToggleCompare = (id: StrategyId) => {
    setCompareSelection((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    setCompareLoading(true);
    try {
      const res = await fetch("/api/quant/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategies: compareSelection,
          period: "3y",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCompareResult(data as CompareResult);
    } catch {
      // ignore
    } finally {
      setCompareLoading(false);
    }
  };

  const selectedStrategy = strategies.find((s) => s.id === selectedId);

  return (
    <div className="space-y-4">
      {metricsWarning && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] text-accent">
          FINNHUB_API_KEY가 설정되지 않았습니다. Railway/서버 환경 변수를
          확인해주세요.
        </div>
      )}

      <StrategyEntryEnvironment />
      <ScreenerSection
        strategies={strategies}
        selectedStrategyId={selectedId}
        onSelectStrategy={setSelectedId}
        favoriteTickers={favorites.tickers}
        onToggleTickerFavorite={toggleTicker}
        compareSelection={compareSelection}
        onToggleCompare={handleToggleCompare}
        onCompare={handleCompare}
        compareLoading={compareLoading}
      />
      {selectedStrategy && (
        <BacktestPanel
          strategy={selectedStrategy}
          isFavorite={favorites.strategies.includes(selectedStrategy.id)}
          onToggleFavorite={() => toggleStrategy(selectedStrategy.id)}
        />
      )}

      {compareResult && (
        <ComparePanel
          result={compareResult}
          onClose={() => setCompareResult(null)}
        />
      )}

      {(favorites.strategies.length > 0 || favorites.tickers.length > 0) && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
          <h3 className="text-xs font-semibold text-gray-400">즐겨찾기</h3>
          {favorites.strategies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {favorites.strategies.map((id) => {
                const s = strategies.find((x) => x.id === id);
                return s ? (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent"
                  >
                    {s.shortName}
                  </button>
                ) : null;
              })}
            </div>
          )}
          {favorites.tickers.length > 0 && (
            <p className="mt-2 text-[11px] text-neutral">
              종목 {favorites.tickers.length}개 저장됨
            </p>
          )}
        </div>
      )}
    </div>
  );
}
