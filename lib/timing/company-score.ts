import { computeStrategyScore } from "@/lib/quant/strategies";
import type { QuantMetrics } from "@/lib/quant/types";

export function computeCompanyScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  const scores = [
    computeStrategyScore("quality-factor", metrics, universe),
    computeStrategyScore("buffett", metrics, universe),
    computeStrategyScore("moat", metrics, universe),
  ].filter((s) => s > 0);

  if (scores.length === 0) {
    return Math.round(
      (computeStrategyScore("quality-factor", metrics, universe) +
        computeStrategyScore("growth", metrics, universe)) /
        2
    );
  }

  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}
