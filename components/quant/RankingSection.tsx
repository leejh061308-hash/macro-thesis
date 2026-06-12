"use client";

import { useEffect, useState } from "react";
import StockResultCard from "./StockResultCard";
import type { StrategyDefinition, StrategyId, StrategyResult } from "@/lib/quant/types";

interface RankingSectionProps {
  strategies: StrategyDefinition[];
  favoriteTickers: string[];
  onToggleTickerFavorite: (ticker: string) => void;
}

export default function RankingSection({
  strategies,
  favoriteTickers,
  onToggleTickerFavorite,
}: RankingSectionProps) {
  const [activeId, setActiveId] = useState<StrategyId>("value");
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/quant/ranking/${activeId}?limit=50`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setResults(data.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [activeId]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        전략별 상위 50종목입니다. 동일 선정 기준·백분위 점수를 적용합니다.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {strategies.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveId(s.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeId === s.id
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-neutral border border-surface-border"
            }`}
          >
            {s.shortName}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-border/40" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((item) => (
            <StockResultCard
              key={item.ticker}
              item={item}
              isFavorite={favoriteTickers.includes(item.ticker)}
              onToggleFavorite={() => onToggleTickerFavorite(item.ticker)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
