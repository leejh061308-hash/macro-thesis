"use client";

import { useState } from "react";
import StockResultCard from "./StockResultCard";
import type { ScreenerFilters, StrategyResult } from "@/lib/quant/types";

interface ScreenerSectionProps {
  favoriteTickers: string[];
  onToggleTickerFavorite: (ticker: string) => void;
}

export default function ScreenerSection({
  favoriteTickers,
  onToggleTickerFavorite,
}: ScreenerSectionProps) {
  const [filters, setFilters] = useState<ScreenerFilters>({
    maxPe: 15,
    minRoe: 0.1,
    minMarketCap: 10_000_000_000,
  });
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/quant/screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: keyof ScreenerFilters, enabled: boolean) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!enabled) delete next[key];
      else if (key === "maxPe") next.maxPe = 15;
      else if (key === "minRoe") next.minRoe = 0.1;
      else if (key === "maxDebtToEquity") next.maxDebtToEquity = 1;
      else if (key === "minRevenueGrowth") next.minRevenueGrowth = 0.05;
      else if (key === "minDividendYield") next.minDividendYield = 0.03;
      else if (key === "minEpsGrowth") next.minEpsGrowth = 0.05;
      else if (key === "minMarketCap") next.minMarketCap = 10_000_000_000;
      return next;
    });
  };

  const presets: Array<{
    label: string;
    key: keyof ScreenerFilters;
    active: boolean;
  }> = [
    { label: "PER 15 이하", key: "maxPe", active: filters.maxPe != null },
    { label: "ROE 10% 이상", key: "minRoe", active: filters.minRoe != null },
    {
      label: "부채비율 낮음",
      key: "maxDebtToEquity",
      active: filters.maxDebtToEquity != null,
    },
    {
      label: "매출 성장 중",
      key: "minRevenueGrowth",
      active: filters.minRevenueGrowth != null,
    },
    {
      label: "배당 3% 이상",
      key: "minDividendYield",
      active: filters.minDividendYield != null,
    },
    {
      label: "EPS 성장 중",
      key: "minEpsGrowth",
      active: filters.minEpsGrowth != null,
    },
    {
      label: "시총 100억$+",
      key: "minMarketCap",
      active: filters.minMarketCap != null,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        조건을 선택하고 검색하세요. 충족 종목을 자동으로 찾습니다.
      </p>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => toggle(p.key, !p.active)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
              p.active
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-neutral border border-surface-border"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={loading}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-surface disabled:opacity-50"
      >
        {loading ? "검색 중..." : "조건 충족 종목 검색"}
      </button>

      {searched && !loading && (
        <p className="text-xs text-neutral">{results.length}개 종목 발견</p>
      )}

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
    </div>
  );
}
