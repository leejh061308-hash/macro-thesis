import type { QuantMetrics } from "./types";
import { needsGrowthEnrich } from "./yahoo-fundamentals";

const MIN_FUNDAMENTAL_COVERAGE = 0.2;
const MIN_GROWTH_COVERAGE = 0.3;

/** 밸류에이션 + 수익성 지표가 최소 한 쌍 이상 채워졌는지 */
export function hasCoreFundamentals(m: QuantMetrics): boolean {
  const hasValue = m.peRatio != null || m.pbRatio != null;
  const hasQuality = m.roe != null || m.operatingMargin != null;
  return hasValue && hasQuality;
}

/** 유니버스 중 핵심 재무 지표가 채워진 종목 비율 (0~1) */
export function fundamentalCoverage(metrics: QuantMetrics[]): number {
  if (metrics.length === 0) return 0;
  const covered = metrics.filter(hasCoreFundamentals).length;
  return covered / metrics.length;
}

/** 매출·EPS 성장률이 채워진 종목 비율 (0~1) */
export function growthCoverage(metrics: QuantMetrics[]): number {
  if (metrics.length === 0) return 0;
  const covered = metrics.filter((m) => !needsGrowthEnrich(m)).length;
  return covered / metrics.length;
}

export function isUniverseFundamentallySparse(metrics: QuantMetrics[]): boolean {
  return fundamentalCoverage(metrics) < MIN_FUNDAMENTAL_COVERAGE;
}

export function isUniverseGrowthSparse(metrics: QuantMetrics[]): boolean {
  return growthCoverage(metrics) < MIN_GROWTH_COVERAGE;
}

/** 전략 적합도가 사실상 계산되지 않은 상태 (모멘텀만 살아 있음) */
export function isOverviewLikelyStale(
  overviews: Array<{ suitabilityScore: number }>
): boolean {
  const nonZero = overviews.filter((o) => o.suitabilityScore > 0).length;
  return nonZero <= 1;
}

/** 진입 환경이 기본값 50으로만 채워진 stale 캐시 */
export function isEntryEnvLikelyStale(
  environments: Array<{ entryScore: number }>
): boolean {
  if (environments.length === 0) return true;
  const allFifty = environments.every((e) => e.entryScore === 50);
  const unique = new Set(environments.map((e) => e.entryScore));
  return allFifty || unique.size <= 1;
}
