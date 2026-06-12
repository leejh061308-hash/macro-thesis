export interface TimingBreakdown {
  valuation: number;
  momentum: number;
  overheating: number;
  volatility: number;
  macro: number;
}

export interface TimingScoreResult {
  ticker: string;
  name: string;
  timingScore: number;
  timingLabel: string;
  timingColor: "accent" | "bullish" | "neutral" | "bearish";
  companyScore: number;
  companyLabel: string;
  breakdown: TimingBreakdown;
  interpretation: string;
  priorScore30d: number | null;
  scoreChange30d: number | null;
}

export interface TimingHistoryPoint {
  date: string;
  score: number;
}

export interface TimingOpportunity {
  ticker: string;
  name: string;
  timingScore: number;
  priorScore: number;
  change: number;
  timingLabel: string;
}

export interface WatchlistTimingItem {
  ticker: string;
  name: string;
  timingScore: number;
  priorScore30d: number;
  change: number;
  timingLabel: string;
  alert: string | null;
}

export interface StrategyEntryEnvironment {
  strategyId: string;
  strategyName: string;
  shortName: string;
  entryScore: number;
  entryLabel: string;
}

export type TimingHistoryPeriod = "6m" | "1y";
