"use client";

import { useEffect, useState } from "react";
import QuantLoadingState from "./QuantLoadingState";
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
  const [entryLoading, setEntryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quant/warmup", { method: "GET", cache: "no-store" }).catch(
      () => {}
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    let cancelled = false;

    async function load() {
      try {
        const overviewPromise = fetch(
          "/api/quant/strategies/overview?quick=1",
          { cache: "no-store", signal: controller.signal }
        ).then((res) => res.json());

        const entryPromise = fetch("/api/timing/strategy-environment", {
          cache: "no-store",
          signal: controller.signal,
        }).then((res) => res.json());

        const overviewData = await overviewPromise;
        if (cancelled) return;
        if (overviewData.error) throw new Error(overviewData.error);

        setStrategies(overviewData.strategies ?? []);
        setLoading(false);

        const entryData = await entryPromise;
        if (cancelled) return;

        const environments = entryData.environments ?? [];
        setStrategies((prev) =>
          prev.map((s) => {
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
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.name === "AbortError") {
          setError("데이터 준비 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
        } else {
          setError(e instanceof Error ? e.message : "로드 실패");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setEntryLoading(false);
        }
        clearTimeout(timeout);
      }
    }

    void load();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white">투자 전략</h3>
        <p className="text-[10px] text-neutral">
          현재 어떤 스타일이 유리한지 상대 순위로 확인하세요
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
        <div className="grid gap-2 sm:grid-cols-2">
          {strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              entryLoading={entryLoading || s.entryLabel === "…"}
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
  onClick,
}: {
  strategy: StrategyOverviewItem;
  entryLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-surface-border bg-surface-card p-4 text-left transition-colors hover:border-accent/30 hover:bg-accent/5 card-glow"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-accent text-sm">{strategy.icon}</span>
        <span className="text-sm font-semibold text-white">{strategy.name}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-neutral">전략 적합도</p>
          <p className="font-mono text-lg font-bold text-accent">
            {strategy.suitabilityScore}
            <span className="text-xs font-normal text-neutral">점</span>
          </p>
          <p className={`text-[10px] font-medium ${statusColor(strategy.statusLabel)}`}>
            {strategy.statusLabel}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-neutral">현재 진입 환경</p>
          {entryLoading || strategy.entryLabel === "…" ? (
            <p className="mt-1 text-xs text-neutral animate-pulse">계산 중…</p>
          ) : (
            <>
              <p className="font-mono text-lg font-bold text-white">
                {strategy.entryScore >= 0 ? strategy.entryScore : "—"}
                <span className="text-xs font-normal text-neutral">점</span>
              </p>
              <p className="text-[10px] text-neutral">{strategy.entryLabel}</p>
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-400 line-clamp-2">
        {strategy.marketInsight}
      </p>
    </button>
  );
}
