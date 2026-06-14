"use client";

import ScoreGauge from "@/components/ui/ScoreGauge";
import Card from "@/components/ui/Card";
import type { TimingScoreResult } from "@/lib/timing/types";

interface ScoreCardsProps {
  timing: TimingScoreResult;
}

function riskFromVolatility(volatility: number): {
  label: string;
  color: string;
} {
  if (volatility >= 70) return { label: "높음", color: "text-bearish" };
  if (volatility >= 40) return { label: "보통", color: "text-warning" };
  return { label: "낮음", color: "text-bullish" };
}

export default function ScoreCards({ timing }: ScoreCardsProps) {
  const risk = riskFromVolatility(timing.breakdown.volatility);

  return (
    <div className="grid grid-cols-3 gap-2">
      <Card padding="sm" className="flex flex-col items-center">
        <ScoreGauge
          score={timing.companyScore}
          label="AI 추천도"
          sublabel={timing.companyLabel}
          size="sm"
        />
      </Card>

      <Card padding="sm" className="flex flex-col items-center">
        <ScoreGauge
          score={timing.timingScore}
          label="투자 매력도"
          sublabel={timing.timingLabel}
          size="sm"
        />
      </Card>

      <Card padding="sm" className="flex flex-col items-center justify-center text-center">
        <p className="text-[10px] text-muted">위험도</p>
        <p className={`mt-3 text-lg font-bold ${risk.color}`}>{risk.label}</p>
        <p className="mt-1 text-[10px] text-muted">변동성 기준</p>
      </Card>
    </div>
  );
}
