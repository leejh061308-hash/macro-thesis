"use client";

import type { BacktestStats } from "@/lib/quant/types";

interface BacktestStatsGridProps {
  stats: BacktestStats;
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2">
      <p className="text-[10px] text-neutral">{label}</p>
      <p
        className={`font-mono text-sm font-semibold ${
          highlight ? "text-accent" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function BacktestStatsGrid({ stats }: BacktestStatsGridProps) {
  const sign = stats.excessReturn >= 0 ? "+" : "";
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-400">전략 수익률</span>
          <span className="font-mono text-lg font-bold text-accent">
            {stats.totalReturn >= 0 ? "+" : ""}
            {stats.totalReturn.toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-neutral">
          <span>S&P500 {stats.benchmarkReturn >= 0 ? "+" : ""}{stats.benchmarkReturn.toFixed(1)}%</span>
          <span>
            초과수익 {sign}
            {stats.excessReturn.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="연평균(CAGR)" value={`${stats.cagr.toFixed(1)}%`} />
        <StatCard label="최대 낙폭(MDD)" value={`${stats.mdd.toFixed(1)}%`} />
        <StatCard label="변동성" value={`${stats.volatility.toFixed(1)}%`} />
        <StatCard label="승률" value={`${stats.winRate.toFixed(0)}%`} />
        <StatCard
          label="샤프지수"
          value={stats.sharpe.toFixed(2)}
          highlight
        />
      </div>
    </div>
  );
}
