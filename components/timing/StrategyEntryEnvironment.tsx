"use client";

import { useEffect, useState } from "react";
import type { StrategyEntryEnvironment } from "@/lib/timing/types";

export default function StrategyEntryEnvironment() {
  const [items, setItems] = useState<StrategyEntryEnvironment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timing/strategy-environment", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setItems(data.environments ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-32 animate-pulse rounded-xl border border-surface-border bg-surface-card" />
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <h3 className="text-sm font-semibold text-white">전략별 진입 환경</h3>
      <p className="mt-0.5 text-[10px] text-neutral">
        각 전략 상위 종목의 평균 진입 점수
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.strategyId}
            className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2.5"
          >
            <span className="text-sm text-white">{item.shortName} 전략</span>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-accent">
                {item.entryScore}점
              </span>
              <p className="text-[10px] text-neutral">{item.entryLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
