import type { StrategyId } from "./types";

export const ALL_STRATEGY_IDS: StrategyId[] = [
  "value",
  "growth",
  "dividend",
  "quality",
  "low-volatility",
  "quality-factor",
  "momentum",
  "garp",
  "buffett",
  "moat",
  "defensive",
  "ai-beneficiary",
  "rate-hike",
  "rate-cut",
];

export const BACKTEST_PERIODS = ["1y", "3y", "5y", "10y"] as const;

export function isValidStrategyId(id: string): id is StrategyId {
  return ALL_STRATEGY_IDS.includes(id as StrategyId);
}
