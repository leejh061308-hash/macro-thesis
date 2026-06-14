"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { statusColor, type StrategyOverviewItem } from "@/lib/quant/strategy-overview";

export default function MarketSummary() {
  const [summary, setSummary] = useState<string>("");
  const [topStrategies, setTopStrategies] = useState<StrategyOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quant/strategies/overview?quick=1", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const all = (data.strategies ?? []) as StrategyOverviewItem[];
        const sorted = [...all]
          .filter((s) => s.suitabilityScore > 0)
          .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
        const top3 = sorted.slice(0, 3);
        setTopStrategies(top3);

        if (top3.length === 0) {
          setSummary("현재 시장 데이터를 분석 중입니다.");
        } else {
          setSummary(
            `현재 ${top3.map((s) => s.shortName).join("·")} 스타일이 상대적으로 유리합니다. ${top3[0].marketInsight}`
          );
        }
      })
      .catch(() => setSummary("시장 요약을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-28 animate-pulse rounded-card bg-surface-card shadow-card" />
    );
  }

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
