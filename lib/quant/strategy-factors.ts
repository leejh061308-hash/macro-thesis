import {
  computeGrowthScore,
  computeMomentumScore,
  computeQualityScore,
  computeStabilityScore,
  computeValueScore,
} from "./factors";
import type { QuantMetrics, StrategyId } from "./types";

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

  switch (strategyId) {
    case "value":
      return value;
    case "growth":
      return growth;
    case "quality-factor":
      return quality;
    case "momentum":
      return momentum;
    case "dividend":
      return Math.round(value * 0.45 + stability * 0.35 + quality * 0.2);
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
