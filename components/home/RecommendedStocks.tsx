"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import type { StrategyOverviewItem } from "@/lib/quant/strategy-overview";
import type { StrategyResult } from "@/lib/quant/types";

export default function RecommendedStocks() {
  const [stocks, setStocks] = useState<StrategyResult[]>([]);
  const [topStrategy, setTopStrategy] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const overviewRes = await fetch("/api/quant/strategies/overview?quick=1", {
          cache: "no-store",
        });
        const overview = await overviewRes.json();
        const strategies = (overview.strategies ?? []) as StrategyOverviewItem[];
        const top = [...strategies].sort(
          (a, b) => b.suitabilityScore - a.suitabilityScore
        )[0];
        if (!top) return;

        setTopStrategy(top.shortName);
        const picksRes = await fetch(
          `/api/quant/strategies/${top.id}?limit=5`,
          { cache: "no-store" }
        );
        const picks = await picksRes.json();
        setStocks(picks.results ?? []);
      } catch {
        setStocks([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="h-32 animate-pulse rounded-card bg-surface-card shadow-card" />
    );
  }

  if (stocks.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h3 className="section-title">추천 종목</h3>
        <p className="section-subtitle">
          {topStrategy ? `${topStrategy} 전략 기준 Top 5` : "현재 유리한 전략 기준"}
        </p>
      </div>
      <div className="space-y-2">
        {stocks.map((stock, i) => (
          <Link key={stock.ticker} href={`/stocks/${stock.ticker}`}>
            <Card interactive padding="sm" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-xs font-semibold text-accent">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">{stock.ticker}</p>
                  <p className="text-[11px] text-muted">{stock.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-accent">{stock.strategyScore}점</p>
                <p className="text-[10px] text-muted">전략 점수</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
