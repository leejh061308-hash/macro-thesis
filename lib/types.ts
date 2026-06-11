import type { MarketSession } from "@/lib/market-quote";

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  session?: MarketSession;
}

export interface StockDetail {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  session?: MarketSession;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  revenue: number | null;
  netIncome: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  currency: string;
}

export type ChartPeriod = "1d" | "1w" | "1m" | "1y";

export interface ChartDataPoint {
  timestamp: number;
  close: number;
  label: string;
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  marketImpact?: string;
  summaryPending?: boolean;
  publishedAt: string;
  url: string;
  source: string;
}

export interface MainNewsItem {
  id: number;
  title: string;
  summary: string;
  sourceUrl: string | null;
  publishedAt: string;
  createdAt: string;
  aiAnalysis: string;
  aiAnalysisPending?: boolean;
}

export interface CreateMainNewsRequest {
  title: string;
  summary: string;
  sourceUrl?: string;
  publishedAt?: string;
}

export interface UpdateMainNewsRequest {
  id: number;
  title?: string;
  summary?: string;
  sourceUrl?: string | null;
  publishedAt?: string;
}

export interface StockAnalysis {
  ticker: string;
  name: string;
  companySummary: string;
  userOpinion?: string;
  userOpinionReview?: string;
  investmentPoints: string[];
  risks: string[];
  macroImpact: string;
  keyIndicators: string[];
  overallOpinion: string;
}

export interface AnalyzeRequest {
  ticker: string;
  investmentOpinion?: string;
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  sortOrder: number;
}
