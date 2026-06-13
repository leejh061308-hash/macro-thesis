import type { StrategyId } from "./types";

/** 기본 탭에 노출하는 8대 스타일 전략 */
export const BASIC_STYLE_STRATEGY_IDS: StrategyId[] = [
  "growth",
  "value",
  "dividend",
  "quality-factor",
  "momentum",
  "garp",
  "buffett",
  "moat",
];

export const ALL_STRATEGY_IDS: StrategyId[] = [
  "value",
  "growth",
  "dividend",
  "quality-factor",
  "momentum",
  "garp",
  "buffett",
  "moat",
  "ai-beneficiary",
  "datacenter",
  "power-infra",
  "rate-hike",
  "rate-cut",
  "defensive",
];

export const BACKTEST_PERIODS = ["1y", "3y", "5y", "10y"] as const;

export function isValidStrategyId(id: string): id is StrategyId {
  return ALL_STRATEGY_IDS.includes(id as StrategyId);
}

export function isBasicStyleStrategy(id: string): id is StrategyId {
  return BASIC_STYLE_STRATEGY_IDS.includes(id as StrategyId);
}
