"use client";

import { useEffect, useState } from "react";
import {
  statusColor,
  type StrategyOverviewItem,
} from "@/lib/quant/strategy-overview";
import type { StrategyId } from "@/lib/quant/types";

interface StrategyOverviewPanelProps {
  onSelectStrategy: (id: StrategyId) => void;
}

export default function StrategyOverviewPanel({
  onSelectStrategy,
}: StrategyOverviewPanelProps) {
  const [strategies, setStrategies] = useState<StrategyOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quant/strategies/overview", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStrategies(data.strategies ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "로드 실패");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white">투자 전략</h3>
        <p className="text-[10px] text-neutral">
          현재 시장에서 유리한 전략을 확인하세요
        </p>
      </div>

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-border/40" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-bearish">{error}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              onClick={() => onSelectStrategy(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyCard({
  strategy,
  onClick,
}: {
  strategy: StrategyOverviewItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-surface-border bg-surface-card p-4 text-left transition-colors hover:border-accent/30 hover:bg-accent/5 card-glow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-accent text-sm">{strategy.icon}</span>
            <span className="text-sm font-semibold text-white">{strategy.name}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[10px] text-neutral">현재 시장 적합도</p>
              <p className="font-mono text-xl font-bold text-accent">
                {strategy.suitabilityScore}
                <span className="text-xs font-normal text-neutral">점</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-neutral">현재 상태</p>
              <p className={`text-sm font-semibold ${statusColor(strategy.statusLabel)}`}>
                {strategy.statusLabel}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-400 line-clamp-2">
            {strategy.marketInsight}
          </p>
        </div>
      </div>
    </button>
  );
}
