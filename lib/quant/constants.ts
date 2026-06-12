import type { StrategyId } from "./types";

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
