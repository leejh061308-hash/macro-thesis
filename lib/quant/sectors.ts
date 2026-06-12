import type { StrategyId } from "./types";
import type { QuantMetrics } from "./types";

/** 필수소비재 · 헬스케어 · 유틸리티 */
export const DEFENSIVE_TICKERS = new Set([
  "PG", "KO", "PEP", "CL", "MO", "PM", "WMT", "COST", "MCD", "SBUX",
  "JNJ", "MRK", "LLY", "PFE", "ABT", "UNH", "AMGN", "GILD", "BMY", "TMO", "MDT", "SYK", "REGN", "VRTX", "CI",
  "SO", "DUK", "NEE",
]);

/** 반도체 · 클라우드 · AI 인프라 */
export const AI_BENEFICIARY_TICKERS = new Set([
  "NVDA", "AMD", "AVGO", "MU", "LRCX", "KLAC", "INTC", "TXN", "QCOM", "ADI", "SNPS", "CDNS",
  "MSFT", "GOOGL", "META", "ORCL", "CRM", "NOW", "PANW", "ADBE", "NFLX", "IBM", "ACN",
  "EQIX", "AMZN",
]);

/** 은행 · 보험 · 금융 */
export const RATE_HIKE_TICKERS = new Set([
  "JPM", "BAC", "GS", "MS", "BLK", "SPGI", "AXP", "C", "WFC", "SCHW", "CB", "BRK-B",
  "MET", "PRU", "CI",
]);

/** 성장주 · 기술주 · REITs */
export const RATE_CUT_TICKERS = new Set([
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "CRM", "NFLX", "ADBE", "NOW",
  "PLD", "AMT", "EQIX", "O", "SPG", "PSA",
]);

const THEMATIC: Partial<Record<StrategyId, Set<string>>> = {
  defensive: DEFENSIVE_TICKERS,
  "ai-beneficiary": AI_BENEFICIARY_TICKERS,
  "rate-hike": RATE_HIKE_TICKERS,
  "rate-cut": RATE_CUT_TICKERS,
};

export function getStrategyPool(
  strategyId: StrategyId,
  universe: QuantMetrics[]
): QuantMetrics[] {
  const thematic = THEMATIC[strategyId];
  if (!thematic) return universe;
  return universe.filter((m) => thematic.has(m.ticker));
}

export function getSelectionNote(strategyId: StrategyId): string {
  switch (strategyId) {
    case "defensive":
      return "필수소비재, 헬스케어, 유틸리티 섹터 종목만 평가합니다.";
    case "ai-beneficiary":
      return "반도체, 클라우드, AI 인프라 관련 종목만 평가합니다.";
    case "rate-hike":
      return "은행, 보험, 금융 섹터 종목만 평가합니다.";
    case "rate-cut":
      return "성장주, 기술주, REITs 종목만 평가합니다.";
    default:
      return "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.";
  }
}
