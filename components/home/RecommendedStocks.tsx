"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import type { StrategyResult } from "@/lib/quant/types";

interface RecommendedStocksProps {
  stocks: StrategyResult[];
  topStrategy: string;
  loading?: boolean;
}

export default function RecommendedStocks({
  stocks,
  topStrategy,
  loading,
}: RecommendedStocksProps) {
  if (loading) {
    return (
      <section>
        <div className="mb-3 h-5 w-24 animate-pulse rounded bg-white/5" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-card bg-surface-card shadow-card"
            />
          ))}
        </div>
      </section>
    );
  }

  if (stocks.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h3 className="section-title">추천 종목</h3>
        <p className="section-subtitle">
          {topStrategy ? `${topStrategy} 전략 Top 5` : "유리한 전략 기준"}
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
