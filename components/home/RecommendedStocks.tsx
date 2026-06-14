"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import type { StrategyOverviewItem } from "@/lib/quant/strategy-overview";
import type { StrategyId, StrategyResult } from "@/lib/quant/types";

async function fetchStrategyPicks(
  strategyId: StrategyId,
  limit: number,
  signal?: AbortSignal
): Promise<StrategyResult[]> {
  const res = await fetch(
    `/api/quant/strategies/${strategyId}?limit=${limit}&quick=1`,
    { cache: "no-store", signal }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "로드 실패");
  return data.results ?? [];
}

export default function RecommendedStocks() {
  const [stocks, setStocks] = useState<StrategyResult[]>([]);
  const [topStrategy, setTopStrategy] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    async function load() {
      try {
        await fetch("/api/quant/warmup", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        }).catch(() => {});

        const overviewRes = await fetch(
          "/api/quant/strategies/overview?quick=1",
          { cache: "no-store", signal: controller.signal }
        );
        const overview = await overviewRes.json();
        const strategies = (overview.strategies ?? []) as StrategyOverviewItem[];
        const sorted = [...strategies]
          .filter((s) => s.suitabilityScore > 0)
          .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

        for (const strategy of sorted.slice(0, 6)) {
          const picks = await fetchStrategyPicks(
            strategy.id,
            5,
            controller.signal
          );
          if (picks.length > 0) {
            setStocks(picks);
            setTopStrategy(strategy.shortName);
            return;
          }
        }

        setStocks([]);
        setError("추천 종목을 준비 중입니다. 잠시 후 새로고침해 주세요.");
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setError("데이터 준비 시간이 초과되었습니다.");
        } else {
          setError("추천 종목을 불러오지 못했습니다.");
        }
        setStocks([]);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    }

    void load();
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-32 animate-pulse rounded-card bg-surface-card shadow-card" />
    );
  }

  return (
    <section>
      <div className="mb-3">
        <h3 className="section-title">추천 종목</h3>
        <p className="section-subtitle">
          {topStrategy
            ? `${topStrategy} 전략 기준 Top 5`
            : "현재 유리한 전략 기준"}
        </p>
      </div>

      {error && stocks.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-muted">{error}</p>
        </Card>
      )}

      {stocks.length > 0 && (
        <div className="space-y-2">
          {stocks.map((stock, i) => (
            <Link key={stock.ticker} href={`/stocks/${stock.ticker}`}>
              <Card
                interactive
                padding="sm"
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-xs font-semibold text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {stock.ticker}
                    </p>
                    <p className="text-[11px] text-muted">{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-accent">
                    {stock.strategyScore}점
                  </p>
                  <p className="text-[10px] text-muted">전략 점수</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
