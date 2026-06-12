"use client";

import { useEffect, useState } from "react";
import BacktestChart from "./BacktestChart";
import BacktestStatsGrid from "./BacktestStatsGrid";
import type {
  BacktestPeriod,
  BacktestResult,
  StrategyDefinition,
  StrategyId,
} from "@/lib/quant/types";

const PERIODS: { value: BacktestPeriod; label: string }[] = [
  { value: "1y", label: "1년" },
  { value: "3y", label: "3년" },
  { value: "5y", label: "5년" },
  { value: "10y", label: "10년" },
  { value: "max", label: "최대" },
];

interface BacktestPanelProps {
  strategy: StrategyDefinition;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function BacktestPanel({
  strategy,
  isFavorite,
  onToggleFavorite,
}: BacktestPanelProps) {
  const [period, setPeriod] = useState<BacktestPeriod>("3y");
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setInterpretation(null);
    fetch(
      `/api/quant/strategies/${strategy.id}/backtest?period=${period}`,
      { cache: "no-store" }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBacktest(data as BacktestResult);
      })
      .catch((e) => {
        setBacktest(null);
        setError(e instanceof Error ? e.message : "로드 실패");
      })
      .finally(() => setLoading(false));
  }, [strategy.id, period]);

  const handleInterpret = async () => {
    if (!backtest) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/quant/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyName: backtest.strategyName,
          periodLabel: backtest.periodLabel,
          stats: backtest.stats,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInterpretation(data.interpretation);
    } catch (e) {
      setInterpretation(
        e instanceof Error ? e.message : "AI 해석을 불러오지 못했습니다."
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-accent">{strategy.icon}</span>
            <h3 className="text-base font-bold text-white">{strategy.name}</h3>
          </div>
          <p className="mt-1 text-xs text-gray-400">{strategy.description}</p>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`text-lg ${isFavorite ? "text-accent" : "text-neutral"}`}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {strategy.criteria.map((c) => (
          <span
            key={c}
            className="rounded-full border border-surface-border px-2 py-0.5 text-[10px] text-gray-400"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === p.value
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-neutral border border-surface-border"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
        <h4 className="mb-3 text-xs font-semibold text-gray-300">
          백테스트 결과
        </h4>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-24 rounded-lg bg-surface-border/40" />
            <div className="h-48 rounded-lg bg-surface-border/40" />
          </div>
        ) : error ? (
          <p className="text-sm text-bearish">{error}</p>
        ) : backtest ? (
          <div className="space-y-4">
            <BacktestStatsGrid stats={backtest.stats} />
            <BacktestChart
              data={backtest.chart}
              strategyName={strategy.shortName}
            />
            <p className="text-[10px] leading-relaxed text-neutral">
              {backtest.methodology}
            </p>
            {!interpretation ? (
              <button
                type="button"
                onClick={handleInterpret}
                disabled={aiLoading}
                className="w-full rounded-lg border border-accent/30 bg-accent/10 py-2.5 text-xs font-semibold text-accent disabled:opacity-50"
              >
                {aiLoading ? "AI 해석 생성 중..." : "AI 해석 보기"}
              </button>
            ) : (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                <p className="text-[11px] font-semibold text-accent mb-1">
                  AI 해석
                </p>
                <p className="text-xs leading-relaxed text-gray-300">
                  {interpretation}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { StrategyId };
