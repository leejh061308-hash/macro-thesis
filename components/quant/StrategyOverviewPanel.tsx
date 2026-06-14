"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import QuantLoadingState from "./QuantLoadingState";
import {
  statusColor,
  type StrategyOverviewItem,
} from "@/lib/quant/strategy-overview";
import { BASIC_STYLE_STRATEGY_IDS } from "@/lib/quant/constants";
import type { StrategyId } from "@/lib/quant/types";

const STRATEGY_EMOJI: Partial<Record<StrategyId, string>> = {
  growth: "🚀",
  value: "💰",
  dividend: "🏦",
  "quality-factor": "🛡",
  momentum: "📈",
  garp: "🎯",
  buffett: "🦉",
  moat: "🏰",
};

interface StrategyOverviewPanelProps {
  onSelectStrategy: (id: StrategyId) => void;
}

export default function StrategyOverviewPanel({
  onSelectStrategy,
}: StrategyOverviewPanelProps) {
  const [strategies, setStrategies] = useState<StrategyOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryLoading, setEntryLoading] = useState(true);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quant/warmup", { method: "GET", cache: "no-store" }).catch(
      () => {}
    );

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function load(isPoll = false) {
      try {
        const [overviewRes, entryRes] = await Promise.all([
          fetch("/api/quant/strategies/overview?quick=1", {
            cache: "no-store",
          }),
          fetch("/api/timing/strategy-environment", {
            cache: "no-store",
          }),
        ]);

        const overviewData = await overviewRes.json();
        if (cancelled) return;
        if (overviewData.error) throw new Error(overviewData.error);

        const all = (overviewData.strategies ?? []) as StrategyOverviewItem[];
        const isWarming = Boolean(overviewData.warming || overviewData.partial);
        setWarming(isWarming);

        const entryData = await entryRes.json();
        if (cancelled) return;

        const environments = entryData.environments ?? [];
        const entryLooksStale =
          environments.length === 0 ||
          (environments.every(
            (e: { entryScore: number }) => e.entryScore === 50
          ) &&
            new Set(environments.map((e: { entryScore: number }) => e.entryScore))
              .size <= 1);

        setStrategies(
          all
            .filter((s) => BASIC_STYLE_STRATEGY_IDS.includes(s.id))
            .map((s) => {
              if (entryLooksStale) return s;
              const env = environments.find(
                (e: { strategyId: string }) => e.strategyId === s.id
              );
              if (!env) return s;
              return {
                ...s,
                entryScore: env.entryScore,
                entryLabel: env.entryLabel,
              };
            })
        );
        setLoading(false);
        setEntryLoading(entryLooksStale);
        setError(null);

        if (isWarming && !cancelled) {
          if (!pollTimer) {
            pollTimer = setInterval(() => void load(true), 5000);
          }
        } else if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      } catch (e) {
        if (cancelled) return;
        if (!isPoll) {
          setError(e instanceof Error ? e.message : "로드 실패");
        }
      } finally {
        if (!cancelled && !isPoll) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="section-title">투자 전략</h3>
        <p className="section-subtitle">
          {warming
            ? "시장 데이터를 불러오는 중…"
            : "현재 어떤 스타일이 유리한지 확인하세요"}
        </p>
      </div>

      {loading ? (
        <QuantLoadingState />
      ) : error ? (
        <div className="space-y-2">
          <p className="text-sm text-bearish">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-accent underline-offset-2 hover:underline"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              entryLoading={entryLoading || s.entryLabel === "…"}
              warming={warming && s.suitabilityScore === 0}
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
  entryLoading,
  warming,
  onClick,
}: {
  strategy: StrategyOverviewItem;
  entryLoading: boolean;
  warming: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card interactive padding="md" className="h-full">
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {STRATEGY_EMOJI[strategy.id] ?? strategy.icon}
          </span>
          <span className="text-sm font-bold text-text">{strategy.shortName}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted">전략 적합도</p>
            {warming ? (
              <p className="mt-1 text-xs text-muted animate-pulse">계산 중…</p>
            ) : (
              <>
                <p className="text-2xl font-semibold text-accent">
                  {strategy.suitabilityScore}
                  <span className="text-xs font-normal text-muted">점</span>
                </p>
                <p className={`text-xs font-medium ${statusColor(strategy.statusLabel)}`}>
                  {strategy.statusLabel}
                </p>
              </>
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted">진입 환경</p>
            {entryLoading || strategy.entryLabel === "…" ? (
              <p className="mt-1 text-xs text-muted animate-pulse">계산 중…</p>
            ) : (
              <>
                <p className="text-2xl font-semibold text-text">
                  {strategy.entryScore >= 0 ? strategy.entryScore : "—"}
                  <span className="text-xs font-normal text-muted">점</span>
                </p>
                <p className="text-[10px] text-muted">{strategy.entryLabel}</p>
              </>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted line-clamp-2">
          {strategy.marketInsight}
        </p>
      </Card>
    </button>
  );
}
