"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { FACTOR_LABELS } from "@/lib/quant/factors";
import type { FactorId, RankingEntry } from "@/lib/quant/types";

function fireCount(score: number): string {
  if (score >= 85) return "🔥🔥🔥🔥🔥";
  if (score >= 75) return "🔥🔥🔥🔥";
  if (score >= 65) return "🔥🔥🔥";
  if (score >= 55) return "🔥🔥";
  if (score >= 45) return "🔥";
  return "·";
}

interface FactorHeatmapVisualProps {
  universeId?: string;
}

export default function FactorHeatmapVisual({
  universeId = "combined",
}: FactorHeatmapVisualProps) {
  const [heatmap, setHeatmap] = useState<
    Array<{ factor: FactorId; label: string; score: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quant/ranking?universe=${universeId}&limit=50`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        const entries = (data.entries ?? []) as RankingEntry[];
        if (entries.length === 0) return;

        const factors = Object.keys(FACTOR_LABELS) as FactorId[];
        const avg = factors.map((f) => {
          const sum = entries.reduce((s, e) => s + e.factors[f], 0);
          return {
            factor: f,
            label: FACTOR_LABELS[f].shortName,
            score: Math.round(sum / entries.length),
          };
        });
        setHeatmap(avg.sort((a, b) => b.score - a.score));
      })
      .catch(() => setHeatmap([]))
      .finally(() => setLoading(false));
  }, [universeId]);

  if (loading) {
    return (
      <div className="h-40 animate-pulse rounded-card bg-surface-card shadow-card" />
    );
  }

  if (heatmap.length === 0) return null;

  return (
    <Card padding="md" className="bg-surface-raised/50">
      <p className="mb-1 text-xs font-semibold text-text">시장 팩터 히트맵</p>
      <p className="mb-4 text-[10px] text-muted">현재 유니버스 평균 팩터 강도</p>
      <div className="space-y-3">
        {heatmap.map((item) => (
          <div key={item.factor} className="flex items-center justify-between gap-3">
            <span className="w-16 text-xs text-text-secondary">{item.label}</span>
            <span className="flex-1 text-sm tracking-wider">{fireCount(item.score)}</span>
            <span className="w-8 text-right text-xs font-semibold text-text">
              {item.score}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        {heatmap[0] &&
          `현재 시장은 ${heatmap.slice(0, 2).map((h) => h.label).join("·")} 팩터 중심으로 움직이고 있습니다.`}
      </p>
    </Card>
  );
}
