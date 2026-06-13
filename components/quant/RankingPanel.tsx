"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  FactorId,
  FactorWeights,
  MultiFactorStrategyDefinition,
  MultiFactorStrategyId,
  RankingEntry,
  RankingResponse,
  UniverseId,
} from "@/lib/quant/types";
import { FACTOR_LABELS } from "@/lib/quant/factors";
import StockFactorDetail from "./StockFactorDetail";

const FACTOR_COLORS: Record<FactorId, string> = {
  value: "text-amber-400",
  quality: "text-emerald-400",
  growth: "text-sky-400",
  momentum: "text-violet-400",
  stability: "text-rose-400",
};

interface RankingPanelProps {
  strategyId: MultiFactorStrategyId | "custom";
  weights: FactorWeights;
  universeId: UniverseId;
  onSelectStock: (ticker: string) => void;
  selectedTicker: string | null;
  favoriteTickers: string[];
  onToggleFavorite: (ticker: string) => void;
}

export default function RankingPanel({
  strategyId,
  weights,
  universeId,
  onSelectStock,
  selectedTicker,
  favoriteTickers,
  onToggleFavorite,
}: RankingPanelProps) {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<FactorId | "overall">("overall");

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        strategy: strategyId,
        universe: universeId,
        limit: "50",
      });
      if (strategyId === "custom") {
        for (const [k, v] of Object.entries(weights)) {
          params.set(`w_${k}`, String(v ?? 0));
        }
      }
      const res = await fetch(`/api/quant/ranking?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json as RankingResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [strategyId, weights, universeId]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const sorted = data?.entries
    ? [...data.entries].sort((a, b) => {
        if (sortBy === "overall") return b.overallScore - a.overallScore;
        return b.factors[sortBy] - a.factors[sortBy];
      })
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">팩터 랭킹</h3>
          <p className="text-[10px] text-neutral">
            {data
              ? `${data.universeSize}종목 · Percentile Rank 기반`
              : "유니버스 전체 상대 순위"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <SortChip
            label="Overall"
            active={sortBy === "overall"}
            onClick={() => setSortBy("overall")}
          />
          {(Object.keys(FACTOR_LABELS) as FactorId[]).map((f) => (
            <SortChip
              key={f}
              label={FACTOR_LABELS[f].shortName}
              active={sortBy === f}
              onClick={() => setSortBy(f)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-border/40" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-bearish">{error}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, i) => (
            <RankingRow
              key={entry.ticker}
              entry={entry}
              displayRank={i + 1}
              isSelected={selectedTicker === entry.ticker}
              isFavorite={favoriteTickers.includes(entry.ticker)}
              onSelect={() => onSelectStock(entry.ticker)}
              onToggleFavorite={() => onToggleFavorite(entry.ticker)}
            />
          ))}
        </div>
      )}

      {selectedTicker && (
        <StockFactorDetail
          ticker={selectedTicker}
          universeId={universeId}
          weights={weights}
          onClose={() => onSelectStock("")}
        />
      )}
    </div>
  );
}

function SortChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
        active
          ? "bg-accent/20 text-accent border border-accent/30"
          : "text-neutral border border-surface-border"
      }`}
    >
      {label}
    </button>
  );
}

function RankingRow({
  entry,
  displayRank,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  entry: RankingEntry;
  displayRank: number;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-colors cursor-pointer ${
        isSelected
          ? "border-accent/40 bg-accent/5"
          : "border-surface-border bg-surface-card hover:border-accent/20"
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-neutral">#{displayRank}</span>
            <span className="truncate text-sm font-semibold text-white">
              {entry.name}
            </span>
            <span className="text-[10px] text-neutral">{entry.ticker}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <ScoreBadge label="Overall" value={entry.overallScore} highlight />
            {(Object.keys(FACTOR_LABELS) as FactorId[]).map((f) => (
              <ScoreBadge
                key={f}
                label={FACTOR_LABELS[f].shortName}
                value={entry.factors[f]}
                className={FACTOR_COLORS[f]}
              />
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`text-sm ${isFavorite ? "text-accent" : "text-neutral"}`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({
  label,
  value,
  highlight,
  className,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
        highlight
          ? "bg-accent/15 text-accent"
          : `bg-surface-border/50 ${className ?? "text-gray-300"}`
      }`}
    >
      {label} {value}
    </span>
  );
}

export type { MultiFactorStrategyDefinition };
