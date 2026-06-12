export type StrategyId =
  | "value"
  | "growth"
  | "dividend"
  | "quality"
  | "low-volatility";

export type BacktestPeriod = "1y" | "3y" | "5y" | "10y" | "max";

export type QuantSection = "strategy" | "ranking" | "screener";

export interface StrategyDefinition {
  id: StrategyId;
  name: string;
  shortName: string;
  description: string;
  criteria: string[];
  icon: string;
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
  dividendYield: number | null;
  dividendGrowth: number | null;
  payoutRatio: number | null;
  roe: number | null;
  debtToEquity: number | null;
  beta: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  marketCap: number | null;
}

export interface StrategyResult {
  ticker: string;
  name: string;
  score: number;
  tags: string[];
  rank: number;
}

export interface BacktestPoint {
  date: string;
  strategyReturn: number;
  benchmarkReturn: number;
}

export interface BacktestStats {
  totalReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  cagr: number;
  mdd: number;
  volatility: number;
  winRate: number;
  sharpe: number;
}

export interface BacktestResult {
  strategyId: StrategyId;
  strategyName: string;
  period: BacktestPeriod;
  periodLabel: string;
  stats: BacktestStats;
  chart: BacktestPoint[];
  methodology: string;
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
  strategies: Array<{
    id: StrategyId;
    name: string;
    stats: BacktestStats;
    chart: BacktestPoint[];
  }>;
}
