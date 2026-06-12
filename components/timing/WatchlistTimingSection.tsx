"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WatchlistTimingItem } from "@/lib/timing/types";

export default function WatchlistTimingSection() {
  const [items, setItems] = useState<WatchlistTimingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timing/watchlist", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-20 animate-pulse rounded-xl border border-surface-border bg-surface-card" />
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <h3 className="text-sm font-semibold text-white">관심종목 진입 모니터링</h3>
      <p className="mt-0.5 text-[10px] text-neutral">30일 진입 점수 변화</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <Link
            key={item.ticker}
            href={`/stocks/${encodeURIComponent(item.ticker)}`}
            className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2.5 hover:border-accent/30"
          >
            <div>
              <p className="text-sm font-medium text-white">{item.name}</p>
              <p className="text-[10px] text-neutral">{item.timingLabel}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs">
                <span className="text-neutral">{item.priorScore30d}</span>
                {" → "}
                <span
                  className={
                    item.change >= 0 ? "text-bullish" : "text-bearish"
                  }
                >
                  {item.timingScore}
                </span>
              </p>
              {item.alert && (
                <p className="text-[10px] text-accent">{item.alert}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
