"use client";

import { useEffect, useState } from "react";
import StockResultCard from "./StockResultCard";
import type { StrategyDefinition, StrategyId, StrategyResult } from "@/lib/quant/types";

interface StrategySectionProps {
  strategies: StrategyDefinition[];
  selectedId: StrategyId | null;
  onSelect: (id: StrategyId) => void;
  favoriteTickers: string[];
  onToggleTickerFavorite: (ticker: string) => void;
  compareSelection: StrategyId[];
  onToggleCompare: (id: StrategyId) => void;
  onCompare: () => void;
  compareLoading: boolean;
}

export default function StrategySection({
  strategies,
  selectedId,
  onSelect,
  favoriteTickers,
  onToggleTickerFavorite,
  compareSelection,
  onToggleCompare,
  onCompare,
  compareLoading,
}: StrategySectionProps) {
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/quant/strategies/${selectedId}?limit=15`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setResults(data.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-gray-400">
          검증된 투자 전략을 선택하세요. 모든 종목에 동일한 기준을 적용합니다.
        </p>
        <div className="grid gap-2">
          {strategies.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selectedId === s.id
                  ? "border-accent/40 bg-accent/10"
                  : "border-surface-border bg-surface-card hover:border-accent/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-accent">{s.icon}</span>
                  <span className="text-sm font-semibold text-white">
                    {s.shortName}
                  </span>
                </div>
                <label className="flex items-center gap-1 text-[10px] text-neutral">
                  <input
                    type="checkbox"
                    checked={compareSelection.includes(s.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleCompare(s.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="accent-accent"
                  />
                  비교
                </label>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">{s.description}</p>
            </button>
          ))}
        </div>
      </div>

      {compareSelection.length >= 2 && (
        <button
          type="button"
          onClick={onCompare}
          disabled={compareLoading}
          className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-surface disabled:opacity-50"
        >
          {compareLoading
            ? "비교 중..."
            : `${compareSelection.length}개 전략 비교하기`}
        </button>
      )}

      {selectedId && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">전략 결과</h3>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-surface-border/40"
                />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="text-xs text-neutral">
              결과를 불러오지 못했습니다. FINNHUB_API_KEY 설정을 확인해주세요.
            </p>
          ) : (
            results.map((item) => (
              <StockResultCard
                key={item.ticker}
                item={item}
                isFavorite={favoriteTickers.includes(item.ticker)}
                onToggleFavorite={() => onToggleTickerFavorite(item.ticker)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
