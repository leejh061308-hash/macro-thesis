"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ResearchDisclaimer from "@/components/layout/ResearchDisclaimer";
import type { TimingOpportunity } from "@/lib/timing/types";

export default function TodaysOpportunities() {
  const [items, setItems] = useState<TimingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timing/opportunities", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setItems(data.opportunities ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-24 animate-pulse rounded-xl border border-surface-border bg-surface-card" />
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <h3 className="text-sm font-semibold text-white">오늘의 기회</h3>
      <p className="mt-0.5 text-[10px] text-neutral">
        최근 30일 진입 점수가 크게 상승한 종목
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <Link
            key={item.ticker}
            href={`/stocks/${encodeURIComponent(item.ticker)}`}
            className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2.5 transition-colors hover:border-accent/30"
          >
            <div>
              <p className="text-sm font-medium text-white">{item.name}</p>
              <p className="text-[10px] text-neutral">{item.ticker}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-neutral">
                {item.priorScore} →{" "}
                <span className="text-accent font-semibold">
                  {item.timingScore}
                </span>
              </p>
              <p className="text-[10px] text-bullish">
                +{item.change} · {item.timingLabel}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <ResearchDisclaimer variant="timing" className="mt-3" />
    </div>
  );
}
