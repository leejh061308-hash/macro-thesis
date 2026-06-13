import { computeStrategyFactorScore } from "@/lib/quant/strategy-factors";
import { computeStrategyScore } from "@/lib/quant/strategies";
import type { QuantMetrics, StrategyId } from "@/lib/quant/types";

function scoreOrFactor(
  strategyId: StrategyId,
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  const legacy = computeStrategyScore(strategyId, metrics, universe);
  if (legacy > 0) return legacy;
  return computeStrategyFactorScore(strategyId, metrics, universe);
}

export function computeCompanyScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  const scores = [
    scoreOrFactor("quality-factor", metrics, universe),
    scoreOrFactor("buffett", metrics, universe),
    scoreOrFactor("moat", metrics, universe),
  ].filter((s) => s > 0);

  if (scores.length === 0) {
    return Math.round(
      (scoreOrFactor("quality-factor", metrics, universe) +
        scoreOrFactor("growth", metrics, universe)) /
        2
    );
  }

  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}
