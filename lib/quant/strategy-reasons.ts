import type { StrategyId } from "./types";
import type { QuantMetrics } from "./types";
import { getStrategy, computeStrategyScore } from "./strategies";
import { getThemeSectorHint, getStrategyPool, isThemeStrategy } from "./sectors";

function topPercentile(
  pool: QuantMetrics[],
  metrics: QuantMetrics,
  getter: (m: QuantMetrics) => number | null,
  threshold: number,
  lowerIsBetter = false
): boolean {
  const values = pool.map(getter).filter((v): v is number => v != null && Number.isFinite(v));
  const mine = getter(metrics);
  if (mine == null || values.length === 0) return false;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = lowerIsBetter
    ? sorted.filter((v) => v >= mine).length / sorted.length
    : sorted.filter((v) => v <= mine).length / sorted.length;
  return rank >= threshold;
}

export function buildSelectionReasons(
  strategyId: StrategyId,
  metrics: QuantMetrics,
  pool: QuantMetrics[],
  strategyScore: number
): string[] {
  if (strategyScore <= 0) return [];

  const reasons: string[] = [];
  const strategy = getStrategy(strategyId);

  if (isThemeStrategy(strategyId)) {
    const sectorHint = getThemeSectorHint(strategyId, metrics.ticker);
    if (sectorHint) reasons.push(sectorHint);
  }

  switch (strategyId) {
    case "value":
      if (topPercentile(pool, metrics, (m) => m.peRatio, 0.7, true) && metrics.peRatio != null && metrics.peRatio > 0) {
        reasons.push("PER 부담 낮음");
      }
      if (topPercentile(pool, metrics, (m) => m.pbRatio, 0.7, true) && metrics.pbRatio != null) {
        reasons.push("PBR 매력");
      }
      if (topPercentile(pool, metrics, (m) => m.freeCashFlowYield, 0.65, false) && metrics.freeCashFlowYield != null) {
        reasons.push("FCF Yield 양호");
      }
      break;
    case "growth":
      if (metrics.revenueGrowth != null && metrics.revenueGrowth >= 0.08) reasons.push("매출 성장률 우수");
      if (metrics.epsGrowth != null && metrics.epsGrowth >= 0.08) reasons.push("EPS 성장률 우수");
      if (metrics.operatingIncomeGrowth != null && metrics.operatingIncomeGrowth >= 0.08) {
        reasons.push("영업이익 성장률 우수");
      }
      if (metrics.fcfGrowth != null && metrics.fcfGrowth >= 0.08) reasons.push("FCF 성장률 우수");
      break;
    case "dividend":
      if (metrics.dividendYield != null && metrics.dividendYield >= 0.025) reasons.push("배당수익률 양호");
      if (metrics.dividendGrowth != null && metrics.dividendGrowth >= 0.03) reasons.push("배당 성장세");
      if (metrics.payoutRatio != null && metrics.payoutRatio > 0 && metrics.payoutRatio < 0.75) {
        reasons.push("배당 안정성 양호");
      }
      break;
    case "quality-factor":
      if (metrics.roe != null && metrics.roe >= 0.15) reasons.push("ROE 우수");
      if (metrics.roic != null && metrics.roic >= 0.12) reasons.push("ROIC 우수");
      if (metrics.debtToEquity != null && metrics.debtToEquity <= 1) reasons.push("부채비율 양호");
      break;
    case "momentum":
      if (metrics.return12m != null && metrics.return12m >= 0.1) reasons.push("12개월 모멘텀 강세");
      if (metrics.relativeStrength != null && metrics.relativeStrength >= 0.6) reasons.push("상대강도 우수");
      break;
    case "garp":
      if (metrics.pegRatio != null && metrics.pegRatio > 0 && metrics.pegRatio <= 1.5) reasons.push("PEG 매력");
      if (metrics.revenueGrowth != null && metrics.revenueGrowth >= 0.08) reasons.push("성장성 우수");
      break;
    case "buffett":
      if (metrics.roe != null && metrics.roe >= 0.15) reasons.push("ROE 우수");
      if (metrics.freeCashFlowYield != null && metrics.freeCashFlowYield > 0) reasons.push("잉여현금흐름 양호");
      if (metrics.debtToEquity != null && metrics.debtToEquity <= 1) reasons.push("재무 건전성 우수");
      break;
    case "moat":
      if (metrics.roic != null && metrics.roic >= 0.12) reasons.push("ROIC 우수");
      if (metrics.earningsStability != null && metrics.earningsStability >= 0.6) reasons.push("이익 안정성 우수");
      if (metrics.cashFlowStability != null && metrics.cashFlowStability >= 0.6) reasons.push("현금흐름 안정");
      break;
    case "rate-hike":
      if (metrics.roe != null && metrics.roe >= 0.12) reasons.push("ROE 우수");
      if (metrics.pbRatio != null && metrics.pbRatio > 0 && metrics.pbRatio <= 2) reasons.push("PBR 매력");
      if (metrics.dividendYield != null && metrics.dividendYield >= 0.02) reasons.push("배당 매력 우수");
      if (metrics.epsGrowth != null && metrics.epsGrowth >= 0.05) reasons.push("실적 성장세");
      reasons.push("금리 상승 수혜 가능성");
      break;
    case "rate-cut":
      if (metrics.revenueGrowth != null && metrics.revenueGrowth >= 0.08) reasons.push("매출 성장률 우수");
      if (metrics.epsGrowth != null && metrics.epsGrowth >= 0.08) reasons.push("EPS 성장률 우수");
      if (metrics.return6m != null && metrics.return6m >= 0.05) reasons.push("모멘텀 양호");
      break;
    case "ai-beneficiary":
      if (metrics.revenueGrowth != null && metrics.revenueGrowth >= 0.1) reasons.push("높은 매출 성장률");
      if (metrics.roe != null && metrics.roe >= 0.15) reasons.push("ROE 우수");
      if (metrics.return12m != null && metrics.return12m >= 0.15) reasons.push("강한 모멘텀");
      reasons.push("AI 투자 확대 수혜");
      break;
    case "datacenter":
      if (metrics.revenueGrowth != null && metrics.revenueGrowth >= 0.08) reasons.push("성장률 우수");
      if (metrics.operatingMargin != null && metrics.operatingMargin >= 0.15) reasons.push("수익성 양호");
      if (metrics.return6m != null && metrics.return6m >= 0) reasons.push("모멘텀 유지");
      break;
    case "power-infra":
      if (metrics.revenueGrowth != null && metrics.revenueGrowth >= 0.05) reasons.push("성장성 양호");
      if (metrics.roe != null && metrics.roe >= 0.12) reasons.push("수익성 우수");
      if (metrics.debtToEquity != null && metrics.debtToEquity <= 1.5) reasons.push("재무 안정성 양호");
      break;
    case "defensive":
      if (metrics.dividendYield != null && metrics.dividendYield >= 0.02) reasons.push("배당 안정성");
      if (metrics.volatility != null && metrics.volatility <= 0.25) reasons.push("변동성 낮음");
      if (metrics.earningsStability != null && metrics.earningsStability >= 0.6) reasons.push("실적 방어성");
      break;
  }

  if (reasons.length === 0) {
    reasons.push(`${strategy.shortName} 전략 점수 ${strategyScore}점`);
  }

  return [...new Set(reasons)].slice(0, 5);
}

export function buildReasonsForRequest(
  strategyId: StrategyId,
  metrics: QuantMetrics,
  fullUniverse: QuantMetrics[]
): { score: number; reasons: string[] } {
  const scoringPool = getStrategyPool(strategyId, fullUniverse);

  if (isThemeStrategy(strategyId) && !scoringPool.some((p) => p.ticker === metrics.ticker)) {
    return { score: 0, reasons: [] };
  }

  const score = computeStrategyScore(strategyId, metrics, fullUniverse);
  const reasons = buildSelectionReasons(strategyId, metrics, scoringPool, score);
  return { score, reasons };
}
