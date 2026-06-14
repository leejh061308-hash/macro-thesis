"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import QuantLoadingState from "@/components/quant/QuantLoadingState";
import { statusColor, type StrategyOverviewItem } from "@/lib/quant/strategy-overview";
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

export default function StrategyScrollSection() {
  const [strategies, setStrategies] = useState<StrategyOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quant/warmup", { cache: "no-store" }).catch(() => {});
    fetch("/api/quant/strategies/overview?quick=1", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const all = (data.strategies ?? []) as StrategyOverviewItem[];
        const filtered = all
          .filter((s) => BASIC_STYLE_STRATEGY_IDS.includes(s.id))
          .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
        setStrategies(filtered);
      })
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="min-w-0">
      <div className="mb-3">
        <h3 className="section-title">현재 유리한 전략</h3>
        <p className="section-subtitle">
          시장 환경에 맞는 투자 스타일 · 가로로 스크롤
        </p>
      </div>

      {loading ? (
        <QuantLoadingState label="전략 분석 중" />
      ) : (
        <div className="-mx-4 px-4 sm:-mx-0 sm:px-0">
          <HorizontalScroll>
            {strategies.map((s) => (
              <Link
                key={s.id}
                href="/quant"
                className="w-[220px] flex-shrink-0 snap-start"
              >
                <Card interactive padding="md" className="h-full">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">
                      {STRATEGY_EMOJI[s.id] ?? s.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text">{s.shortName}</p>
                      <p className="mt-2 text-2xl font-semibold text-accent">
                        {s.suitabilityScore}
                        <span className="ml-0.5 text-xs font-normal text-muted">
                          점
                        </span>
                      </p>
                      <p
                        className={`mt-0.5 text-xs font-medium ${statusColor(s.statusLabel)}`}
                      >
                        {s.statusLabel}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted line-clamp-2">
                    {s.marketInsight}
                  </p>
                </Card>
              </Link>
            ))}
          </HorizontalScroll>
        </div>
      )}
    </section>
  );
}
