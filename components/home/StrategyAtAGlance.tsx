"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import { statusColor, type StrategyOverviewItem } from "@/lib/quant/strategy-overview";
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

interface StrategyAtAGlanceProps {
  strategies: StrategyOverviewItem[];
  loading?: boolean;
  warming?: boolean;
}

export default function StrategyAtAGlance({
  strategies,
  loading,
  warming,
}: StrategyAtAGlanceProps) {
  const leader = strategies[0];

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3 className="section-title">현재 유리한 전략</h3>
          <p className="section-subtitle">8대 스타일 한눈에 비교</p>
        </div>
        {warming && (
          <p className="text-[10px] text-muted animate-pulse">업데이트 중…</p>
        )}
        {leader && !loading && !warming && (
          <p className="text-[10px] text-muted">
            1위{" "}
            <span className="font-semibold text-accent">{leader.shortName}</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl bg-surface-card shadow-card"
            />
          ))}
        </div>
      ) : (
        <Card padding="md" className="space-y-1">
          {strategies.map((s, index) => (
            <Link
              key={s.id}
              href="/quant"
              className="flex items-center gap-2 rounded-xl px-1 py-2 transition-colors hover:bg-white/5"
            >
              <span className="w-5 text-center text-xs text-muted">{index + 1}</span>
              <span className="w-6 text-base">{STRATEGY_EMOJI[s.id] ?? s.icon}</span>
              <span className="w-14 shrink-0 text-xs font-medium text-text">
                {s.shortName}
              </span>
              <div className="min-w-0 flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all duration-500"
                    style={{ width: `${Math.max(s.suitabilityScore, 4)}%` }}
                  />
                </div>
              </div>
              <span className="w-7 shrink-0 text-right text-sm font-semibold text-text">
                {warming && s.suitabilityScore === 0 ? "…" : s.suitabilityScore}
              </span>
              <span
                className={`hidden w-10 shrink-0 text-right text-[10px] font-medium sm:inline ${statusColor(s.statusLabel)}`}
              >
                {s.statusLabel}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
