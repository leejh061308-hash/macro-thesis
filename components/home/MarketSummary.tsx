"use client";

import Card from "@/components/ui/Card";
import { statusColor, type StrategyOverviewItem } from "@/lib/quant/strategy-overview";

interface MarketSummaryProps {
  summary: string;
  topStrategies: StrategyOverviewItem[];
  loading?: boolean;
}

export default function MarketSummary({
  summary,
  topStrategies,
  loading,
}: MarketSummaryProps) {
  if (loading) {
    return (
      <div className="h-24 animate-pulse rounded-card bg-surface-card shadow-card" />
    );
  }

  if (!summary) return null;

  return (
    <section>
      <div className="mb-3">
        <h3 className="section-title">시장 요약</h3>
        <p className="section-subtitle">AI가 정리한 오늘의 시장 흐름</p>
      </div>
      <Card padding="md">
        <p className="text-sm leading-relaxed text-text-secondary">{summary}</p>
        {topStrategies.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {topStrategies.map((s) => (
              <div
                key={s.id}
                className="rounded-full bg-white/5 px-3 py-1.5 text-xs"
              >
                <span className="font-medium text-text">{s.shortName}</span>
                <span className={`ml-1.5 font-semibold ${statusColor(s.statusLabel)}`}>
                  {s.suitabilityScore}점
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
