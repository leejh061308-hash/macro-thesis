"use client";

import { useEffect, useState } from "react";
import BacktestChart from "./BacktestChart";
import BacktestStatsGrid from "./BacktestStatsGrid";
import ComparePanel from "./ComparePanel";
import type {
  BacktestPeriod,
  BacktestResult,
  CompareResult,
  FactorWeights,
  MultiFactorStrategyId,
  PortfolioSize,
  RebalanceFrequency,
} from "@/lib/quant/types";

const PERIODS: { value: BacktestPeriod; label: string }[] = [
  { value: "1y", label: "1년" },
  { value: "3y", label: "3년" },
  { value: "5y", label: "5년" },
  { value: "10y", label: "10년" },
];

const REBALANCES: { value: RebalanceFrequency; label: string }[] = [
  { value: "monthly", label: "월간" },
  { value: "quarterly", label: "분기" },
  { value: "semiannual", label: "반기" },
  { value: "annual", label: "연간" },
];

const PORTFOLIO_SIZES: PortfolioSize[] = [10, 20, 50, 100];

interface FactorBacktestPanelProps {
  strategyId: MultiFactorStrategyId | "custom";
  weights: FactorWeights;
  strategyName: string;
}

export default function FactorBacktestPanel({
  strategyId,
  weights,
  strategyName,
}: FactorBacktestPanelProps) {
  const [period, setPeriod] = useState<BacktestPeriod>("3y");
  const [rebalance, setRebalance] = useState<RebalanceFrequency>("quarterly");
  const [portfolioSize, setPortfolioSize] = useState<PortfolioSize>(20);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setInterpretation(null);
    fetch("/api/quant/backtest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategyId,
        weights,
        period,
        rebalance,
        portfolioSize,
      }),
    })
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
  }, [strategyId, weights, period, rebalance, portfolioSize]);

  const handleCompare = async () => {
    setCompareLoading(true);
    try {
      const res = await fetch("/api/quant/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          weights,
          period,
          rebalance,
          portfolioSize,
          compareBenchmarks: true,
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

  const handleInterpret = async () => {
    if (!backtest) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/quant/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: backtest.strategyId,
          strategyName: backtest.strategyName,
          periodLabel: backtest.periodLabel,
          stats: backtest.stats,
          selectionNote: backtest.selectionNote,
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
    <div className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <div>
        <h3 className="text-sm font-bold text-white">백테스트</h3>
        <p className="text-[10px] text-neutral">
          {strategyName} · Top {portfolioSize} · {REBALANCES.find((r) => r.value === rebalance)?.label} 리밸런싱
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-neutral">기간</p>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              active={period === p.value}
              onClick={() => setPeriod(p.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-neutral">리밸런싱</p>
        <div className="flex flex-wrap gap-1">
          {REBALANCES.map((r) => (
            <Chip
              key={r.value}
              label={r.label}
              active={rebalance === r.value}
              onClick={() => setRebalance(r.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-neutral">종목 수</p>
        <div className="flex flex-wrap gap-1">
          {PORTFOLIO_SIZES.map((s) => (
            <Chip
              key={s}
              label={`Top ${s}`}
              active={portfolioSize === s}
              onClick={() => setPortfolioSize(s)}
            />
          ))}
        </div>
      </div>

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
          <BacktestChart data={backtest.chart} strategyName={strategyName} />
          <p className="text-[10px] leading-relaxed text-neutral">
            {backtest.methodology}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCompare}
              disabled={compareLoading}
              className="flex-1 rounded-lg border border-surface-border py-2 text-xs font-semibold text-gray-300 disabled:opacity-50"
            >
              {compareLoading ? "비교 중..." : "S&P500 · Nasdaq100 비교"}
            </button>
            {!interpretation ? (
              <button
                type="button"
                onClick={handleInterpret}
                disabled={aiLoading}
                className="flex-1 rounded-lg border border-accent/30 bg-accent/10 py-2 text-xs font-semibold text-accent disabled:opacity-50"
              >
                {aiLoading ? "AI 해석..." : "AI 해석"}
              </button>
            ) : null}
          </div>
          {interpretation && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
              <p className="text-[11px] font-semibold text-accent mb-1">AI 해석</p>
              <p className="text-xs leading-relaxed text-gray-300">{interpretation}</p>
            </div>
          )}
        </div>
      ) : null}

      {compareResult && (
        <ComparePanel
          result={compareResult}
          onClose={() => setCompareResult(null)}
        />
      )}
    </div>
  );
}

function Chip({
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
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent/20 text-accent border border-accent/30"
          : "text-neutral border border-surface-border"
      }`}
    >
      {label}
    </button>
  );
}
