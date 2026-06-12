import type { StrategyId } from "./types";
import type { QuantMetrics } from "./types";

/** 대형 기술주 — 금리 인상 전략에서 명시적 제외 */
export const TECH_TICKERS = new Set([
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "CRM",
  "NFLX", "ADBE", "NOW", "SNOW", "PANW", "INTC", "AVGO", "QCOM", "MU", "ORCL",
]);

export const SEMICONDUCTOR_TICKERS = new Set([
  "NVDA", "AMD", "AVGO", "MU", "LRCX", "KLAC", "INTC", "TXN", "QCOM", "ADI", "SNPS", "CDNS", "MRVL", "ON",
]);

export const CLOUD_TICKERS = new Set([
  "MSFT", "AMZN", "GOOGL", "CRM", "NOW", "ORCL", "SNOW", "ADBE", "IBM", "ACN", "WDAY", "TEAM",
]);

export const DATACENTER_OPS_TICKERS = new Set([
  "EQIX", "DLR", "AMT", "PLD", "CCI", "SBAC", "IRM", "CONE",
]);

export const DATACENTER_INFRA_TICKERS = new Set([
  "VRT", "SMCI", "ANET", "CSCO", "HPE", "DELL", "NTAP", "STX", "WDC",
]);

export const POWER_EQUIPMENT_TICKERS = new Set([
  "NEE", "DUK", "SO", "EIX", "AEP", "ETN", "GE", "VRT", "CEG", "EMR", "ROK", "HUBB",
]);

export const AI_INFRA_TICKERS = new Set([
  "MSFT", "GOOGL", "META", "ORCL", "CRM", "NOW", "PANW", "EQIX", "AMZN", "IBM", "ACN",
]);

export const AI_BENEFICIARY_TICKERS = new Set([
  ...SEMICONDUCTOR_TICKERS,
  ...AI_INFRA_TICKERS,
  ...DATACENTER_OPS_TICKERS,
  ...CLOUD_TICKERS,
  ...POWER_EQUIPMENT_TICKERS,
]);

export const DATACENTER_THEME_TICKERS = new Set([
  ...DATACENTER_OPS_TICKERS,
  ...DATACENTER_INFRA_TICKERS,
]);

export const POWER_INFRA_THEME_TICKERS = new Set([
  ...POWER_EQUIPMENT_TICKERS,
]);

/** 은행 · 보험 · 자산운용 · 금융서비스 (기술주 제외) */
export const RATE_HIKE_TICKERS = new Set([
  "JPM", "BAC", "WFC", "C", "GS", "MS", "SCHW", "USB", "PNC", "TFC", "BK", "STT", "COF", "AXP",
  "MET", "PRU", "AIG", "ALL", "TRV", "CB", "MMC", "AON", "AFL", "HIG", "PFG", "LNC",
  "BLK", "IVZ", "TROW", "BEN", "NTRS", "RF", "CFG", "HBAN", "KEY", "FITB", "MTB", "CMA",
  "BRK-B", "SPGI", "MCO", "ICE", "CME", "MSCI", "FIS", "FI", "GPN",
]);

export const RATE_CUT_TICKERS = new Set([
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "CRM", "NFLX", "ADBE", "NOW",
  "PLD", "AMT", "EQIX", "O", "SPG", "PSA", "DLR", "CCI", "AVB", "EQR", "WELL", "VTR",
]);

export const DEFENSIVE_TICKERS = new Set([
  "PG", "KO", "PEP", "CL", "MO", "PM", "WMT", "COST", "MCD", "SBUX", "GIS", "K", "HSY",
  "JNJ", "MRK", "LLY", "PFE", "ABT", "UNH", "AMGN", "GILD", "BMY", "TMO", "MDT", "SYK", "REGN", "VRTX", "CI",
  "SO", "DUK", "NEE", "AEP", "SRE", "D", "EXC",
]);

export const CYCLICAL_TICKERS = new Set([
  "CAT", "DE", "BA", "GE", "XOM", "CVX", "FCX", "NUE", "LMT", "RTX", "HON", "MMM",
  "GM", "F", "LOW", "HD", "BKNG", "SBUX", "NKE",
]);

export const JPY_STRONG_BENEFICIARY = new Set([
  "TM", "HMC", "SONY", "MUFG", "SMFG",
]);

export const JPY_WEAK_BENEFICIARY = new Set([
  "PG", "KO", "WMT", "COST", "MCD", "CL", "JNJ", "UNH",
]);

export const STYLE_STRATEGY_IDS: StrategyId[] = [
  "value",
  "growth",
  "dividend",
  "quality-factor",
  "momentum",
  "garp",
  "buffett",
  "moat",
];

export const THEME_STRATEGY_IDS: StrategyId[] = [
  "ai-beneficiary",
  "datacenter",
  "power-infra",
  "rate-hike",
  "rate-cut",
  "defensive",
];

const THEME_POOLS: Partial<Record<StrategyId, Set<string>>> = {
  "ai-beneficiary": AI_BENEFICIARY_TICKERS,
  datacenter: DATACENTER_THEME_TICKERS,
  "power-infra": POWER_INFRA_THEME_TICKERS,
  "rate-hike": RATE_HIKE_TICKERS,
  "rate-cut": RATE_CUT_TICKERS,
  defensive: DEFENSIVE_TICKERS,
};

const INDUSTRY_LABELS: Partial<Record<StrategyId, Record<string, string>>> = {
  "rate-hike": {
    JPM: "은행 업종",
    BAC: "은행 업종",
    WFC: "은행 업종",
    GS: "투자은행",
    MS: "투자은행",
    BLK: "자산운용",
    MET: "보험",
    PRU: "보험",
    CB: "보험",
    AXP: "금융 서비스",
    SCHW: "증권·자산관리",
    "BRK-B": "금융 지주",
  },
  "ai-beneficiary": {
    NVDA: "AI 반도체 핵심",
    AMD: "AI 반도체",
    MSFT: "AI·클라우드",
    GOOGL: "AI·클라우드",
    EQIX: "데이터센터",
    VRT: "AI 전력·냉각",
  },
  datacenter: {
    EQIX: "데이터센터 운영",
    DLR: "데이터센터 운영",
    VRT: "냉각 솔루션",
    SMCI: "서버",
    ANET: "네트워크 장비",
  },
  "power-infra": {
    NEE: "전력·유틸리티",
    ETN: "전력 장비",
    VRT: "전력 관리",
    CEG: "전력 생산",
    ON: "전력 반도체",
  },
  defensive: {
    PG: "필수소비재",
    JNJ: "헬스케어",
    KO: "필수소비재",
    NEE: "유틸리티",
  },
  "rate-cut": {
    PLD: "리츠(REITs)",
    AMT: "리츠(REITs)",
    NVDA: "성장·기술주",
    MSFT: "성장·기술주",
  },
};

export function isThemeStrategy(strategyId: StrategyId): boolean {
  return THEME_STRATEGY_IDS.includes(strategyId);
}

export function isStyleStrategy(strategyId: StrategyId): boolean {
  return STYLE_STRATEGY_IDS.includes(strategyId);
}

export function passesThemeFilter(strategyId: StrategyId, ticker: string): boolean {
  if (!isThemeStrategy(strategyId)) return true;
  const pool = THEME_POOLS[strategyId];
  if (!pool) return true;
  if (!pool.has(ticker)) return false;
  if (strategyId === "rate-hike" && TECH_TICKERS.has(ticker)) return false;
  return true;
}

export function getStrategyPool(
  strategyId: StrategyId,
  universe: QuantMetrics[]
): QuantMetrics[] {
  const thematic = THEME_POOLS[strategyId];
  if (!thematic) return universe;
  return universe.filter((m) => {
    if (!thematic.has(m.ticker)) return false;
    if (strategyId === "rate-hike" && TECH_TICKERS.has(m.ticker)) return false;
    return true;
  });
}

export function getScoringUniverse(
  strategyId: StrategyId,
  fullUniverse: QuantMetrics[]
): QuantMetrics[] {
  return isThemeStrategy(strategyId)
    ? getStrategyPool(strategyId, fullUniverse)
    : fullUniverse;
}

export function getIndustryLabel(strategyId: StrategyId, ticker: string): string | null {
  return INDUSTRY_LABELS[strategyId]?.[ticker] ?? null;
}

export function getThemeSectorHint(strategyId: StrategyId, ticker: string): string | null {
  const explicit = getIndustryLabel(strategyId, ticker);
  if (explicit) return explicit;

  if (strategyId === "rate-hike" && RATE_HIKE_TICKERS.has(ticker)) return "금융 업종";
  if (strategyId === "ai-beneficiary") {
    if (SEMICONDUCTOR_TICKERS.has(ticker)) return "반도체·AI 칩";
    if (DATACENTER_OPS_TICKERS.has(ticker)) return "데이터센터";
    if (CLOUD_TICKERS.has(ticker)) return "클라우드·AI 인프라";
    if (POWER_EQUIPMENT_TICKERS.has(ticker)) return "전력·AI 인프라";
  }
  if (strategyId === "datacenter" && DATACENTER_THEME_TICKERS.has(ticker)) {
    return DATACENTER_OPS_TICKERS.has(ticker) ? "데이터센터 운영" : "데이터센터 인프라";
  }
  if (strategyId === "power-infra" && POWER_INFRA_THEME_TICKERS.has(ticker)) {
    return "전력 인프라";
  }
  if (strategyId === "defensive" && DEFENSIVE_TICKERS.has(ticker)) {
    if (["PG", "KO", "PEP", "CL", "WMT", "COST", "MCD"].includes(ticker)) return "필수소비재";
    if (["JNJ", "MRK", "LLY", "UNH", "PFE"].includes(ticker)) return "헬스케어";
    return "유틸리티·방어주";
  }
  if (strategyId === "rate-cut") {
    if (["PLD", "AMT", "EQIX", "O", "SPG", "PSA"].includes(ticker)) return "리츠(REITs)";
    if (TECH_TICKERS.has(ticker) || RATE_CUT_TICKERS.has(ticker)) return "성장·기술주";
  }
  return null;
}

export function getSelectionNote(strategyId: StrategyId): string {
  switch (strategyId) {
    case "defensive":
      return "1차 필터: 필수소비재 · 헬스케어 · 유틸리티 → 2차 점수: 수익성 · 배당 · 변동성";
    case "ai-beneficiary":
      return "1차 필터: 반도체 · AI 인프라 · 데이터센터 · 클라우드 · 전력설비 → 2차 점수: 성장 · ROE · 모멘텀";
    case "datacenter":
      return "1차 필터: 데이터센터 운영 · 냉각 · 서버 · 네트워크 → 2차 점수: 성장 · 수익성 · 모멘텀";
    case "power-infra":
      return "1차 필터: 전력 장비 · 변압기 · 전력 관리 · 전력 반도체 → 2차 점수: 성장 · 수익성 · 재무";
    case "rate-hike":
      return "1차 필터: 은행 · 보험 · 자산운용 · 금융서비스 (기술주 제외) → 2차 점수: ROE · PBR · 배당 · 성장";
    case "rate-cut":
      return "1차 필터: 성장주 · 리츠 · 기술주 → 2차 점수: 매출 · EPS · 모멘텀";
    default:
      return "업종 제한 없이 재무 데이터와 성과를 기준으로 평가합니다.";
  }
}
