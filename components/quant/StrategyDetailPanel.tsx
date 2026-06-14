"use client";

import { useEffect, useState } from "react";
import BacktestPanel from "./BacktestPanel";
import BasicStockDetail from "./BasicStockDetail";
import {
  buildStrategyAiExplanation,
  statusColor,
  type StrategyOverviewItem,
} from "@/lib/quant/strategy-overview";
import { deriveRiskFromScores, riskColor } from "@/lib/quant/basic-view";
import { getStrategy } from "@/lib/quant/strategies";
import type { StrategyId, StrategyResult } from "@/lib/quant/types";

interface StrategyDetailPanelProps {
  strategyId: StrategyId;
  onBack: () => void;
  favoriteTickers: string[];
  onToggleFavorite: (ticker: string) => void;
}

export default function StrategyDetailPanel({
  strategyId,
  onBack,
  favoriteTickers,
  onToggleFavorite,
}: StrategyDetailPanelProps) {
  const [overview, setOverview] = useState<StrategyOverviewItem | null>(null);
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const strategyDef = getStrategy(strategyId);
  const displayName =
    strategyId === "quality-factor" ? "우량주 전략" : strategyDef.name;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setAiExplanation(null);
    setSelectedTicker(null);

    const controller = new AbortController();

    async function load() {
      try {
        const [overviewData, quickData] = await Promise.all([
          fetch("/api/quant/strategies/overview?quick=1", {
            cache: "no-store",
            signal: controller.signal,
          }).then((r) => r.json()),
          fetch(`/api/quant/strategies/${strategyId}?limit=10&quick=1`, {
            cache: "no-store",
            signal: controller.signal,
          }).then((r) => r.json()),
        ]);

        const item = (
          overviewData.strategies as StrategyOverviewItem[] | undefined
        )?.find((s) => s.id === strategyId);
        if (item) setOverview(item);
        if (quickData.error) throw new Error(quickData.error);
        setResults(quickData.results ?? []);
        setLoading(false);

        const fullRes = await fetch(
          `/api/quant/strategies/${strategyId}?limit=10`,
          { cache: "no-store", signal: controller.signal }
        );
        const fullData = await fullRes.json();
        if (fullData.results?.length) {
          setResults(fullData.results);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "로드 실패");
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [strategyId]);

  useEffect(() => {
    if (!overview || results.length === 0) return;
    setAiExplanation(
      buildStrategyAiExplanation(
        overview,
        results.map((r) => r.ticker)
      )
    );
  }, [overview, results]);

  const handleAiInterpret = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(
        `/api/quant/strategies/${strategyId}/backtest?period=3y`,
        { cache: "no-store" }
      );
      const backtest = await res.json();
      if (!res.ok) throw new Error(backtest.error);

      const interpretRes = await fetch("/api/quant/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          strategyName: displayName,
          periodLabel: backtest.periodLabel,
          stats: backtest.stats,
          selectionNote: strategyDef.selectionNote,
        }),
      });
      const data = await interpretRes.json();
      if (!interpretRes.ok) throw new Error(data.error);
      setAiExplanation(data.interpretation);
    } catch (e) {
      setAiExplanation(
        e instanceof Error ? e.message : "AI 해석을 불러오지 못했습니다."
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-neutral hover:text-accent"
      >
        ← 전략 목록
      </button>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 rounded-xl bg-surface-border/40" />
          <div className="h-40 rounded-xl bg-surface-border/40" />
        </div>
      ) : error ? (
        <p className="text-sm text-bearish">{error}</p>
      ) : (
        <>
          <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
            <div className="flex items-center gap-2">
              <span className="font-mono text-accent">{strategyDef.icon}</span>
              <h3 className="text-base font-bold text-white">{displayName}</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">
              {strategyDef.description}
            </p>
            {overview && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <p className="text-[10px] text-neutral">전략 적합도</p>
                  <p className="font-mono text-2xl font-bold text-accent">
                    {overview.suitabilityScore}
                    <span className="text-sm font-normal text-neutral">점</span>
                  </p>
                  <p className={`text-xs font-semibold ${statusColor(overview.statusLabel)}`}>
                    {overview.statusLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-surface-border p-3">
                  <p className="text-[10px] text-neutral">현재 진입 환경</p>
                  <p className="font-mono text-2xl font-bold text-white">
                    {overview.entryScore}
                    <span className="text-sm font-normal text-neutral">점</span>
                  </p>
                  <p className="text-xs text-neutral">{overview.entryLabel}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white">전략 순위 TOP 10</h4>
            <p className="text-[10px] text-neutral">
              유니버스 내 상대 순위이며, 매수·매도 추천이 아닙니다.
            </p>
            <div className="space-y-2">
              {results.map((item) => {
                const risk = deriveRiskFromScores(
                  item.companyScore,
                  item.timingScore
                );
                return (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => setSelectedTicker(item.ticker)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selectedTicker === item.ticker
                      ? "border-accent/40 bg-accent/5"
                      : "border-surface-border bg-surface-card hover:border-accent/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-neutral">
                        #{item.rank}
                      </span>
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.ticker);
                      }}
                      className={`text-sm ${favoriteTickers.includes(item.ticker) ? "text-accent" : "text-neutral"}`}
                    >
                      {favoriteTickers.includes(item.ticker) ? "★" : "☆"}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <p className="text-neutral">기업 점수</p>
                      <p className="font-mono text-sm font-semibold text-white">
                        {item.companyScore ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral">진입 점수</p>
                      <p className="font-mono text-sm font-semibold text-accent">
                        {item.timingScore ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral">위험도</p>
                      <p className={`text-sm font-semibold ${riskColor(risk)}`}>
                        {risk}
                      </p>
                    </div>
                  </div>
                  {item.reasons.length > 0 && (
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-400 line-clamp-2">
                      {item.reasons[0]}
                    </p>
                  )}
                </button>
              );
              })}
            </div>
          </div>

          {selectedTicker && (
            <BasicStockDetail
              ticker={selectedTicker}
              strategyId={strategyId}
              onClose={() => setSelectedTicker(null)}
            />
          )}

          {aiExplanation && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <p className="text-[11px] font-semibold text-accent mb-1">AI 설명</p>
              <p className="text-xs leading-relaxed text-gray-300">{aiExplanation}</p>
              <button
                type="button"
                onClick={handleAiInterpret}
                disabled={aiLoading}
                className="mt-3 w-full rounded-lg border border-accent/30 py-2 text-xs font-semibold text-accent disabled:opacity-50"
              >
                {aiLoading ? "AI 해석 생성 중..." : "상세 AI 해석 보기"}
              </button>
            </div>
          )}

          <BacktestPanel
            strategy={{
              ...strategyDef,
              name: displayName,
            }}
            isFavorite={false}
            onToggleFavorite={() => {}}
            simplified
          />
        </>
      )}
    </div>
  );
}
