export type StrategyId =
  | "value"
  | "growth"
  | "dividend"
  | "quality-factor"
  | "momentum"
  | "garp"
  | "buffett"
  | "moat"
  | "defensive"
  | "ai-beneficiary"
  | "datacenter"
  | "power-infra"
  | "rate-hike"
  | "rate-cut";

export type FactorId =
  | "value"
  | "quality"
  | "growth"
  | "momentum"
  | "stability";

export type MultiFactorStrategyId =
  | "value-quality"
  | "quality-momentum"
  | "value-momentum"
  | "all-factor"
  | "custom";

export type RebalanceFrequency =
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "annual";

export type PortfolioSize = 10 | 20 | 50 | 100;

export type UniverseId = "combined" | "sp500" | "nasdaq100";

export type BacktestPeriod = "1y" | "3y" | "5y" | "10y";

export interface FactorScores {
  value: number;
  quality: number;
  growth: number;
  momentum: number;
  stability: number;
}

export type FactorRanks = FactorScores;

export interface FactorWeights {
  value?: number;
  quality?: number;
  growth?: number;
  momentum?: number;
  stability?: number;
}

export interface MultiFactorStrategyDefinition {
  id: MultiFactorStrategyId;
  name: string;
  shortName: string;
  description: string;
  aiSummary: string;
  defaultWeights: FactorWeights;
  icon: string;
}

export interface RankingEntry {
  ticker: string;
  name: string;
  factors: FactorScores;
  factorRanks: FactorRanks;
  overallScore: number;
  overallRank: number;
  aiSummary: string;
}

export interface StockMetricsSummary {
  peRatio: number | null;
  pbRatio: number | null;
  evToEbitda: number | null;
  freeCashFlowYield: number | null;
  roe: number | null;
  roic: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  beta: number | null;
}

export interface StockFactorDetailResponse extends RankingEntry {
  metrics: StockMetricsSummary;
}

export interface RankingResponse {
  universe: UniverseId;
  universeSize: number;
  strategyId: MultiFactorStrategyId | "custom";
  weights: FactorWeights;
  entries: RankingEntry[];
  updatedAt: string;
}

export interface BacktestConfig {
  period: BacktestPeriod;
  rebalance: RebalanceFrequency;
  portfolioSize: PortfolioSize;
  weights: FactorWeights;
  strategyId?: MultiFactorStrategyId | "custom";
}

export type StrategyCategory = "style" | "theme";

export interface StrategyDefinition {
  id: StrategyId;
  name: string;
  shortName: string;
  description: string;
  aiSummary: string;
  criteria: string[];
  icon: string;
  category: StrategyCategory;
  selectionNote: string;
  interpretGuide: string;
}

export interface QuantMetrics {
  ticker: string;
  name: string;
  peRatio: number | null;
  pbRatio: number | null;
  evToEbitda: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  dividendYield: number | null;
  dividendGrowth: number | null;
  payoutRatio: number | null;
  roe: number | null;
  roic: number | null;
  debtToEquity: number | null;
  beta: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  marketCap: number | null;
  pegRatio: number | null;
  freeCashFlowYield: number | null;
  return3m: number | null;
  return6m: number | null;
  return12m: number | null;
  relativeStrength: number | null;
  earningsStability: number | null;
  cashFlowStability: number | null;
}

export interface StrategyResult {
  ticker: string;
  name: string;
  score: number;
  strategyScore: number;
  companyScore: number | null;
  timingScore: number | null;
  tags: string[];
  reasons: string[];
  rank: number;
}

export interface BacktestPoint {
  date: string;
  strategyReturn: number;
  benchmarkReturn: number;
  nasdaqReturn: number;
}

export interface BacktestStats {
  totalReturn: number;
  benchmarkReturn: number;
  nasdaqReturn: number;
  excessReturn: number;
  excessVsNasdaq: number;
  cagr: number;
  mdd: number;
  volatility: number;
  winRate: number;
  sharpe: number;
}

export interface BacktestResult {
  strategyId: StrategyId | MultiFactorStrategyId | "custom";
  strategyName: string;
  period: BacktestPeriod;
  periodLabel: string;
  rebalance: RebalanceFrequency;
  rebalanceLabel: string;
  portfolioSize: PortfolioSize;
  stats: BacktestStats;
  chart: BacktestPoint[];
  methodology: string;
  selectionNote: string;
  weights?: FactorWeights;
}

export interface ScreenerFilters {
  maxPe?: number;
  minRoe?: number;
  maxDebtToEquity?: number;
  minRevenueGrowth?: number;
  minDividendYield?: number;
  minEpsGrowth?: number;
  minMarketCap?: number;
}

export interface CompareResult {
  period: BacktestPeriod;
  rebalance: RebalanceFrequency;
  portfolioSize: PortfolioSize;
  strategies: Array<{
    id: StrategyId | MultiFactorStrategyId | "custom" | "spy" | "qqq";
    name: string;
    stats: BacktestStats;
    chart: BacktestPoint[];
  }>;
}
