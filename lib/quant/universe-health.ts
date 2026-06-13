import type { QuantMetrics } from "./types";
import { needsFundamentalEnrich } from "./yahoo-fundamentals";

const MIN_FUNDAMENTAL_COVERAGE = 0.2;

/** 유니버스 중 재무 지표가 채워진 종목 비율 (0~1) */
export function fundamentalCoverage(metrics: QuantMetrics[]): number {
  if (metrics.length === 0) return 0;
  const covered = metrics.filter((m) => !needsFundamentalEnrich(m)).length;
  return covered / metrics.length;
}

export function isUniverseFundamentallySparse(metrics: QuantMetrics[]): boolean {
  return fundamentalCoverage(metrics) < MIN_FUNDAMENTAL_COVERAGE;
}

/** 전략 적합도가 사실상 계산되지 않은 상태 (모멘텀만 살아 있음) */
export function isOverviewLikelyStale(
  overviews: Array<{ suitabilityScore: number }>
): boolean {
  const nonZero = overviews.filter((o) => o.suitabilityScore > 0).length;
  return nonZero <= 1;
}
