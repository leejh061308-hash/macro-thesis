import {
  BACKTEST_CACHE_TTL,
  getCached,
  METRICS_CACHE_TTL,
  setCached,
} from "./cache";
import { fetchUniverseMetrics } from "./metrics-service";
import { computeStrategyScore, computeStyleTags, getStrategy, rankByStrategy } from "./strategies";
import {
  BACKTEST_METHODOLOGY,
  PERIOD_LABELS,
  runBacktest,
} from "./backtest-engine";
import { fetchPricesBatch } from "./yahoo-history";
import { BENCHMARK_TICKER, UNIVERSE_TICKERS } from "./universe";
import type {
  BacktestPeriod,
  BacktestResult,
  CompareResult,
  QuantMetrics,
  ScreenerFilters,
  StrategyId,
  StrategyResult,
} from "./types";

const PORTFOLIO_SIZE = 20;

export async function getUniverseMetrics(): Promise<QuantMetrics[]> {
  const cached = getCached<QuantMetrics[]>("universe-metrics");
  if (cached) return cached;

  const metrics = await fetchUniverseMetrics(UNIVERSE_TICKERS);
  if (metrics.length > 0) {
    setCached("universe-metrics", metrics, METRICS_CACHE_TTL);
  }
  return metrics;
}

export async function getStrategyResults(
  strategyId: StrategyId,
  limit = 20
): Promise<StrategyResult[]> {
  const universe = await getUniverseMetrics();
  return rankByStrategy(strategyId, universe, limit);
}

export async function getRanking(
  strategyId: StrategyId,
  limit = 50
): Promise<StrategyResult[]> {
  return getStrategyResults(strategyId, limit);
}

export async function runStrategyBacktest(
  strategyId: StrategyId,
  period: BacktestPeriod
): Promise<BacktestResult> {
  const cacheKey = `backtest:${strategyId}:${period}`;
  const cached = getCached<BacktestResult>(cacheKey);
  if (cached) return cached;

  const universe = await getUniverseMetrics();
  const ranked = rankByStrategy(strategyId, universe, PORTFOLIO_SIZE);
  const portfolioTickers = ranked.map((r) => r.ticker);

  const priceMap = await fetchPricesBatch(
    [...portfolioTickers, BENCHMARK_TICKER],
    period === "5y" ? "5y" : "10y"
  );

  const { stats, chart } = runBacktest(
    portfolioTickers,
    BENCHMARK_TICKER,
    priceMap,
    period
  );

  const strategy = getStrategy(strategyId);
  const result: BacktestResult = {
    strategyId,
    strategyName: strategy.name,
    period,
    periodLabel: PERIOD_LABELS[period],
    stats,
    chart,
    methodology: BACKTEST_METHODOLOGY,
  };

  setCached(cacheKey, result, BACKTEST_CACHE_TTL);
  return result;
}

export async function compareStrategies(
  strategyIds: StrategyId[],
  period: BacktestPeriod
): Promise<CompareResult> {
  const results = await Promise.all(
    strategyIds.map((id) => runStrategyBacktest(id, period))
  );

  return {
    period,
    strategies: results.map((r) => ({
      id: r.strategyId,
      name: r.strategyName,
      stats: r.stats,
      chart: r.chart,
    })),
  };
}

export function runScreener(
  filters: ScreenerFilters,
  universe: QuantMetrics[]
): StrategyResult[] {
  const filtered = universe.filter((m) => {
    if (filters.maxPe != null && (m.peRatio == null || m.peRatio > filters.maxPe))
      return false;
    if (filters.minRoe != null && (m.roe == null || m.roe < filters.minRoe))
      return false;
    if (
      filters.maxDebtToEquity != null &&
      (m.debtToEquity == null || m.debtToEquity > filters.maxDebtToEquity)
    )
      return false;
    if (
      filters.minRevenueGrowth != null &&
      (m.revenueGrowth == null || m.revenueGrowth < filters.minRevenueGrowth)
    )
      return false;
    if (
      filters.minDividendYield != null &&
      (m.dividendYield == null || m.dividendYield < filters.minDividendYield)
    )
      return false;
    if (
      filters.minEpsGrowth != null &&
      (m.epsGrowth == null || m.epsGrowth < filters.minEpsGrowth)
    )
      return false;
    if (
      filters.minMarketCap != null &&
      (m.marketCap == null || m.marketCap < filters.minMarketCap)
    )
      return false;
    return true;
  });

  return filtered
    .map((m) => ({
      ticker: m.ticker,
      name: m.name,
      score: Math.round(
        (computeStrategyScore("value", m, universe) +
          computeStrategyScore("growth", m, universe) +
          computeStrategyScore("quality", m, universe)) /
          3
      ),
      tags: computeStyleTags(m, universe),
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
