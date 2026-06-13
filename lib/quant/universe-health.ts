import type { QuantMetrics } from "./types";
import { needsGrowthEnrich } from "./yahoo-fundamentals";

const MIN_FUNDAMENTAL_COVERAGE = 0.2;
const MIN_GROWTH_COVERAGE = 0.3;
const MIN_VALUE_COVERAGE = 0.3;

/** PER 또는 PBR이 채워졌는지 */
export function hasValueMetrics(m: QuantMetrics): boolean {
  return (
    (m.peRatio != null && m.peRatio > 0) ||
    (m.pbRatio != null && m.pbRatio > 0)
  );
}

/** 밸류에이션 + 수익성 지표가 최소 한 쌍 이상 채워졌는지 */
export function hasCoreFundamentals(m: QuantMetrics): boolean {
  const hasQuality = m.roe != null || m.operatingMargin != null;
  return hasValueMetrics(m) && hasQuality;
}

/** PER/PBR이 채워진 종목 비율 (0~1) */
export function valueCoverage(metrics: QuantMetrics[]): number {
  if (metrics.length === 0) return 0;
  const covered = metrics.filter(hasValueMetrics).length;
  return covered / metrics.length;
}

/** 유니버스 중 핵심 재무 지표가 채워진 종목 비율 (0~1) */
export function fundamentalCoverage(metrics: QuantMetrics[]): number {
  if (metrics.length === 0) return 0;
  const covered = metrics.filter(hasCoreFundamentals).length;
  return covered / metrics.length;
}

export function isUniverseValueSparse(metrics: QuantMetrics[]): boolean {
  return valueCoverage(metrics) < MIN_VALUE_COVERAGE;
}

/** 가치주 적합도만 0이고 다른 전략은 살아 있는 stale overview */
export function isValueOverviewStale(
  overviews: Array<{ id?: string; suitabilityScore: number }>
): boolean {
  const value = overviews.find((o) => o.id === "value");
  if (!value || value.suitabilityScore > 0) return false;
  const othersAlive = overviews.filter(
    (o) => o.id !== "value" && o.suitabilityScore > 0
  ).length;
  return othersAlive >= 2;
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

/** 성장주 적합도만 0이고 다른 전략은 살아 있는 stale overview */
export function isGrowthOverviewStale(
  overviews: Array<{ id?: string; suitabilityScore: number }>
): boolean {
  const growth = overviews.find((o) => o.id === "growth");
  if (!growth || growth.suitabilityScore > 0) return false;
  const othersAlive = overviews.filter(
    (o) => o.id !== "growth" && o.suitabilityScore > 0
  ).length;
  return othersAlive >= 2;
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
