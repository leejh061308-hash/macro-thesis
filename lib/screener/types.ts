import type { StrategyId } from "@/lib/quant/types";

export type ScreenerMode = "beginner" | "advanced" | "ai";

export type SortField =
  | "companyScore"
  | "timingScore"
  | "peRatio"
  | "roe"
  | "dividendYield"
  | "revenueGrowth"
  | "epsGrowth"
  | "marketCap"
  | "return12m";

export type BeginnerStyle =
  | "undervalued"
  | "high-growth"
  | "dividend"
  | "quality"
  | "low-volatility"
  | "defensive"
  | "cyclical";

export type BeginnerTheme =
  | "ai"
  | "datacenter"
  | "power-infra"
  | "cloud"
  | "semiconductor";

export type BeginnerMacro =
  | "rate-hike"
  | "rate-cut"
  | "expansion"
  | "recession-defense";

export type MacroFilter =
  | "ai"
  | "datacenter"
  | "power-infra"
  | "cloud"
  | "semiconductor"
  | "rate-hike"
  | "rate-cut"
  | "cyclical"
  | "defensive"
  | "jpy-strong"
  | "jpy-weak";

export interface RangeFilter {
  min?: number;
  max?: number;
}

export interface AdvancedFilters {
  peRatio?: RangeFilter;
  forwardPe?: RangeFilter;
  pbRatio?: RangeFilter;
  psr?: RangeFilter;
  evToEbitda?: RangeFilter;
  fcfYield?: RangeFilter;
  revenueGrowth?: RangeFilter;
  epsGrowth?: RangeFilter;
  operatingMargin?: RangeFilter;
  netMargin?: RangeFilter;
  roe?: RangeFilter;
  roa?: RangeFilter;
  roic?: RangeFilter;
  debtToEquity?: RangeFilter;
  currentRatio?: RangeFilter;
  dividendYield?: RangeFilter;
  dividendGrowth?: RangeFilter;
  payoutRatio?: RangeFilter;
  return1m?: RangeFilter;
  return3m?: RangeFilter;
  return6m?: RangeFilter;
  return12m?: RangeFilter;
  relativeStrength?: RangeFilter;
  rsi?: RangeFilter;
  marketCap?: RangeFilter;
  beta?: RangeFilter;
  aboveMa20?: boolean;
  aboveMa60?: boolean;
  aboveMa200?: boolean;
  goldenCross?: boolean;
  deathCross?: boolean;
  near52WeekHigh?: boolean;
  near52WeekLow?: boolean;
}

export interface ScreenerRequest {
  mode: ScreenerMode;
  beginner?: {
    styles?: BeginnerStyle[];
    themes?: BeginnerTheme[];
    macro?: BeginnerMacro[];
  };
  advanced?: AdvancedFilters;
  strategies?: StrategyId[];
  macroFilters?: MacroFilter[];
  sort?: SortField;
  sortDir?: "asc" | "desc";
  aiQuery?: string;
  limit?: number;
}

export interface ScreenerStockData {
  ticker: string;
  name: string;
  price: number | null;
  currency: string;
  peRatio: number | null;
  forwardPe: number | null;
  pbRatio: number | null;
  psr: number | null;
  evToEbitda: number | null;
  fcfYield: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  dividendYield: number | null;
  dividendGrowth: number | null;
  payoutRatio: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return12m: number | null;
  relativeStrength: number | null;
  rsi: number | null;
  beta: number | null;
  volatility: number | null;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  aboveMa20: boolean | null;
  aboveMa60: boolean | null;
  aboveMa200: boolean | null;
  goldenCross: boolean | null;
  deathCross: boolean | null;
  near52WeekHigh: boolean | null;
  near52WeekLow: boolean | null;
}

export interface ScreenerResult {
  ticker: string;
  name: string;
  price: number | null;
  currency: string;
  companyScore: number;
  timingScore: number | null;
  tags: string[];
  reasons: string[];
  rank: number;
}

export interface SavedScreenerPreset {
  id: string;
  name: string;
  request: ScreenerRequest;
  createdAt: string;
}

export interface ScreenerRunResponse {
  results: ScreenerResult[];
  count: number;
  appliedSummary: string[];
}
