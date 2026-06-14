import {
  computeDividendScore,
  computeGrowthScore,
  computeMomentumScore,
  computeQualityScore,
  computeStabilityScore,
  computeValueScore,
} from "./factors";
import type { FactorWeights, QuantMetrics, StrategyId } from "./types";

const STRATEGY_FACTOR_WEIGHTS: Partial<Record<StrategyId, FactorWeights>> = {
  growth: { growth: 50, quality: 25, momentum: 20, value: 5 },
  value: { value: 55, quality: 25, stability: 10, momentum: 10 },
  "quality-factor": {
    quality: 45,
    stability: 25,
    growth: 15,
    momentum: 10,
    value: 5,
  },
  dividend: { dividend: 45, stability: 25, quality: 20, value: 10 },
  momentum: { momentum: 70, growth: 15, quality: 10, stability: 5 },
};

function computeWeightedFactorScore(
  weights: FactorWeights,
  scores: Record<keyof FactorWeights, number>
): number {
  const entries = (
    Object.entries(weights) as [keyof FactorWeights, number][]
  ).filter(([, w]) => (w ?? 0) > 0);
  if (entries.length === 0) return 0;

  const totalWeight = entries.reduce((s, [, w]) => s + (w ?? 0), 0);
  const sum = entries.reduce(
    (s, [factor, w]) => s + scores[factor] * (w ?? 0),
    0
  );
  return Math.round(sum / totalWeight);
}

/** UI 8대 전략 → 팩터 엔진 점수 매핑 (재무 데이터 부분 누락 시에도 동작) */
export function computeStrategyFactorScore(
  strategyId: StrategyId,
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  const value = computeValueScore(metrics, universe);
  const quality = computeQualityScore(metrics, universe);
  const growth = computeGrowthScore(metrics, universe);
  const momentum = computeMomentumScore(metrics, universe);
  const stability = computeStabilityScore(metrics, universe);
  const dividend = computeDividendScore(metrics, universe);

  const scores = { value, quality, growth, momentum, stability, dividend };

  const preset = STRATEGY_FACTOR_WEIGHTS[strategyId];
  if (preset) {
    return computeWeightedFactorScore(preset, scores);
  }

  switch (strategyId) {
    case "garp":
      return Math.round(growth * 0.5 + value * 0.5);
    case "buffett":
      return Math.round(quality * 0.55 + value * 0.45);
    case "moat":
      return Math.round(quality * 0.6 + stability * 0.4);
    default:
      return 0;
  }
}

export function rankByStrategyFactor(
  strategyId: StrategyId,
  universe: QuantMetrics[],
  limit = 10
): Array<{ ticker: string; name: string; score: number }> {
  return universe
    .map((m) => ({
      ticker: m.ticker,
      name: m.name,
      score: computeStrategyFactorScore(strategyId, m, universe),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function averageTopFactorScore(
  strategyId: StrategyId,
  universe: QuantMetrics[],
  topN = 10
): number {
  const ranked = rankByStrategyFactor(strategyId, universe, topN);
  if (ranked.length === 0) return 0;
  return Math.round(
    ranked.reduce((s, r) => s + r.score, 0) / ranked.length
  );
}
