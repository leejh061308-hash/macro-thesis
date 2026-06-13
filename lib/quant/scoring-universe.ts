import type { QuantMetrics } from "./types";
import { getUniverseTickers } from "./index-universe";

/** 기본 탭·전략 카드용 빠른 스코어링 풀 (대형주 우선) */
export const SCORING_POOL_SIZE = 50;

export function getScoringTickerList(): string[] {
  return getUniverseTickers("combined").slice(0, SCORING_POOL_SIZE);
}

export function selectScoringUniverse(
  metrics: QuantMetrics[],
  limit = SCORING_POOL_SIZE
): QuantMetrics[] {
  if (metrics.length <= limit) return metrics;

  return [...metrics]
    .sort((a, b) => {
      const capDiff = (b.marketCap ?? 0) - (a.marketCap ?? 0);
      if (capDiff !== 0) return capDiff;
      return a.ticker.localeCompare(b.ticker);
    })
    .slice(0, limit);
}

export function isInScoringPool(ticker: string): boolean {
  return getScoringTickerList().includes(ticker);
}
