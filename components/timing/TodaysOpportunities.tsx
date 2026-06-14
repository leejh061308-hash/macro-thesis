"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import ResearchDisclaimer from "@/components/layout/ResearchDisclaimer";
import type { TimingOpportunity } from "@/lib/timing/types";

interface TodaysOpportunitiesProps {
  variant?: "default" | "home";
}

export default function TodaysOpportunities({
  variant = "default",
}: TodaysOpportunitiesProps) {
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
      <div className="h-28 animate-pulse rounded-card bg-surface-card shadow-card" />
    );
  }

  if (items.length === 0) return null;

  const isHome = variant === "home";

  return (
    <section>
      <div className="mb-3">
        <h3 className="section-title">오늘의 기회</h3>
        <p className="section-subtitle">
          진입 점수가 크게 상승한 종목
        </p>
      </div>

      <div className={isHome ? "space-y-2" : "space-y-2"}>
        {items.map((item) => (
          <Link key={item.ticker} href={`/stocks/${encodeURIComponent(item.ticker)}`}>
            <Card interactive padding="sm" className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text">{item.ticker}</p>
                <p className="text-[11px] text-muted">{item.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">진입 점수</p>
                <p className="font-semibold text-text">
                  <span className="text-muted">{item.priorScore}</span>
                  <span className="mx-1 text-muted">→</span>
                  <span className="text-accent">{item.timingScore}</span>
                </p>
                <p className="text-[10px] text-bullish">+{item.change}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {!isHome && <ResearchDisclaimer variant="timing" className="mt-3" />}
    </section>
  );
}
