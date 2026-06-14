"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import type { FactorId, FactorScores, FactorWeights } from "@/lib/quant/types";
import { FACTOR_LABELS } from "@/lib/quant/factors";

interface FactorRadarChartProps {
  scores?: FactorScores;
  weights?: FactorWeights;
  title?: string;
}

const FACTOR_IDS: FactorId[] = [
  "value",
  "quality",
  "growth",
  "momentum",
  "stability",
];

export default function FactorRadarChart({
  scores,
  weights,
  title = "멀티팩터 프로필",
}: FactorRadarChartProps) {
  const data = FACTOR_IDS.map((id) => ({
    factor: FACTOR_LABELS[id].shortName,
    value: scores ? scores[id] : (weights?.[id] ?? 0),
  }));

  return (
    <Card padding="md" className="bg-accent-secondary/5">
      <p className="mb-3 text-xs font-semibold text-accent-secondary">{title}</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(148,163,184,0.2)" />
            <PolarAngleAxis
              dataKey="factor"
              tick={{ fill: "#CBD5E1", fontSize: 10 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
