import {
  BACKTEST_CACHE_TTL,
  getCached,
  METRICS_CACHE_TTL,
  peekCached,
  setCached,
} from "./cache";
import {
  HOME_API_CACHE_KEY,
  HOME_API_CACHE_TTL,
  OVERVIEW_CACHE_KEY,
  RANKING_CACHE_TTL,
  SCORING_METRICS_CACHE_KEY,
  UNIVERSE_CACHE_VERSION,
} from "./cache-keys";
import {
  enrichMomentumFromPrices,
  enrichFullScoringPool,
  enrichFinnhubCoreMetrics,
  enrichGrowthFields,
  enrichStabilityFromPrices,
  enrichValueFields,
  fetchUniverseProfiles,
  deriveComputedMetrics,
} from "./metrics-service";
import { enrichFundamentalsFromYahoo } from "./yahoo-fundamentals";
import { getFallbackStrategyOverviews } from "./fallback-overviews";
import { getScoringTickerList, selectScoringUniverse } from "./scoring-universe";
import {
  fundamentalCoverage,
  isEntryEnvLikelyStale,
  isGrowthOverviewStale,
  isOverviewLikelyStale,
  isUniverseFundamentallySparse,
  isUniverseGrowthSparse,
  isUniverseValueSparse,
  isValueOverviewStale,
} from "./universe-health";
import {
  computeStrategyScore,
  computeStyleTags,
  getSelectionNote,
  getStrategy,
  rankByStrategy,
} from "./strategies";
import {
  buildBacktestMethodology,
  PERIOD_LABELS,
  REBALANCE_LABELS,
  runBacktest,
} from "./backtest-engine";
import { fetchPricesBatch } from "./yahoo-history";
import {
  BENCHMARK_TICKER,
  NASDAQ_BENCHMARK_TICKER,
} from "./universe";
import {
  getMultiFactorStrategy,
  resolveWeights,
} from "./multi-factor";
import {
  buildUniverseRanking,
  getStockFactorDetail,
  rankByMultiFactor,
} from "./ranking";
import { getUniverseTickers } from "./index-universe";
import { MULTI_FACTOR_STRATEGIES } from "./multi-factor";
import {
  computeAllStrategyOverviews,
  type StrategyOverviewItem,
} from "./strategy-overview";
import { getStrategyEntryEnvironments } from "@/lib/timing/service";
import { getTimingLabel } from "@/lib/timing/labels";
import type {
  BacktestConfig,
  BacktestPeriod,
  BacktestResult,
  CompareResult,
  FactorWeights,
  MultiFactorStrategyId,
  QuantMetrics,
  RankingResponse,
  RebalanceFrequency,
  ScreenerFilters,
  StrategyId,
  StrategyResult,
  UniverseId,
} from "./types";

const DEFAULT_PORTFOLIO_SIZE = 20;

const SCORING_CACHE_KEY = SCORING_METRICS_CACHE_KEY;

export { SCORING_METRICS_CACHE_KEY };

const SCORING_ENRICH_BUDGET_MS = 8_000;

let fullUniverseInFlight: Promise<void> | null = null;
let scoringInFlight: Promise<QuantMetrics[]> | null = null;
let scoringEnrichInFlight: Promise<void> | null = null;
let slowEnrichInFlight: Promise<void> | null = null;
let stabilityEnrichInFlight: Promise<void> | null = null;
let overviewRefreshInFlight: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enrichScoringFast(metrics: QuantMetrics[]): Promise<void> {
  await Promise.race([
    Promise.all([
      enrichFundamentalsFromYahoo(metrics, { concurrency: 12 }),
      enrichFinnhubCoreMetrics(metrics),
    ]),
    sleep(SCORING_ENRICH_BUDGET_MS),
  ]);
}

function refreshOverviewCache(universe: QuantMetrics[]): void {
  if (overviewRefreshInFlight) return;
  overviewRefreshInFlight = Promise.resolve()
    .then(() => {
      const overviews = computeAllStrategyOverviews(universe);
      if (overviews.length > 0) {
        setCached(OVERVIEW_CACHE_KEY, overviews, METRICS_CACHE_TTL);
      }
    })
    .finally(() => {
      overviewRefreshInFlight = null;
    });
}

function completeSlowScoringEnrich(metrics: QuantMetrics[]): void {
  if (slowEnrichInFlight) return;

  slowEnrichInFlight = (async () => {
    await enrichGrowthFields(metrics);
    await enrichValueFields(metrics);
    await enrichMomentumFromPrices(metrics, {
      range: "3y",
      concurrency: 8,
      essentialOnly: true,
    });
    deriveComputedMetrics(metrics);
    persistScoringCache(metrics);
    refreshOverviewCache(metrics);
    triggerStabilityBackground(metrics);
  })().finally(() => {
    slowEnrichInFlight = null;
  });
}

function triggerStabilityBackground(metrics: QuantMetrics[]): void {
  const needs = metrics.some(
    (m) => m.volatility == null || m.maxDrawdown == null
  );
  if (!needs || stabilityEnrichInFlight) return;

  stabilityEnrichInFlight = enrichStabilityFromPrices(metrics)
    .then(() => {
      persistScoringCache(metrics);
    })
    .finally(() => {
      stabilityEnrichInFlight = null;
    });
}

function persistScoringCache(metrics: QuantMetrics[]): void {
  if (!isUniverseFundamentallySparse(metrics)) {
    setCached(SCORING_CACHE_KEY, metrics, METRICS_CACHE_TTL);
  }
}

async function ensureScoringFieldsEnriched(metrics: QuantMetrics[]): Promise<void> {
  const needsGrowth = isUniverseGrowthSparse(metrics);
  const needsValue = isUniverseValueSparse(metrics);
  if (!needsGrowth && !needsValue) return;

  if (scoringEnrichInFlight) {
    await scoringEnrichInFlight;
    return;
  }

  scoringEnrichInFlight = (async () => {
    if (needsGrowth) await enrichGrowthFields(metrics);
    if (needsValue) await enrichValueFields(metrics);
    persistScoringCache(metrics);
  })().finally(() => {
    scoringEnrichInFlight = null;
  });

  await scoringEnrichInFlight;
}

export function getCachedScoringUniverse(): QuantMetrics[] | null {
  const cached = getCached<QuantMetrics[]>(SCORING_CACHE_KEY);
  if (cached?.length && !isUniverseFundamentallySparse(cached)) {
    return cached;
  }
  return null;
}

function triggerFullUniverseBackground(): void {
  if (fullUniverseInFlight) return;
  fullUniverseInFlight = enrichFullUniverse("combined")
    .then(() => undefined)
    .finally(() => {
      fullUniverseInFlight = null;
    });
}

async function enrichFullUniverse(universeId: UniverseId = "combined"): Promise<void> {
  const tickers = getUniverseTickers(universeId);
  const cacheKey = `universe-metrics-${UNIVERSE_CACHE_VERSION}:${universeId}`;
  const cached = getCached<QuantMetrics[]>(cacheKey);
  if (cached?.length && !isUniverseFundamentallySparse(cached)) return;

  const metrics = cached?.length ? cached : await fetchUniverseProfiles(tickers);
  const pool = selectScoringUniverse(metrics);
  const poolSet = new Set(pool.map((m) => m.ticker));
  const rest = metrics.filter((m) => !poolSet.has(m.ticker));

  if (!cached?.length) {
    await enrichFullScoringPool(pool);
  } else if (isUniverseFundamentallySparse(pool)) {
    await enrichFullScoringPool(pool);
  }

  if (rest.length > 0) {
    await enrichFundamentalsFromYahoo(rest, {
      skipDetailFallback: true,
      concurrency: 8,
    });
    await enrichMomentumFromPrices(rest, { range: "3y", concurrency: 6 });
  }

  setCached(cacheKey, metrics, METRICS_CACHE_TTL);
}

/** 기본 탭·전략 카드용 — 대형주 36종목만 빠르게 준비 */
export async function getScoringUniverseMetrics(): Promise<QuantMetrics[]> {
  const cached = getCachedScoringUniverse();
  if (cached) {
    void ensureScoringFieldsEnriched(cached);
    triggerStabilityBackground(cached);
    triggerFullUniverseBackground();
    return cached;
  }

  if (scoringInFlight) return scoringInFlight;

  scoringInFlight = loadScoringUniverseMetrics().finally(() => {
    scoringInFlight = null;
  });
  return scoringInFlight;
}

async function loadScoringUniverseMetrics(): Promise<QuantMetrics[]> {
  const tickers = getScoringTickerList();
  let metrics = peekCached<QuantMetrics[]>(SCORING_CACHE_KEY)?.data;

  if (!metrics?.length || metrics.length !== tickers.length) {
    metrics = await fetchUniverseProfiles(tickers);
    persistScoringCache(metrics);
  }

  await enrichScoringFast(metrics);
  persistScoringCache(metrics);
  completeSlowScoringEnrich(metrics);
  triggerFullUniverseBackground();
  return metrics;
}

export async function getUniverseMetrics(
  universeId: UniverseId = "combined"
): Promise<QuantMetrics[]> {
  const cacheKey = `universe-metrics-${UNIVERSE_CACHE_VERSION}:${universeId}`;

  const cached = getCached<QuantMetrics[]>(cacheKey);
  if (cached?.length && !isUniverseFundamentallySparse(cached)) {
    return cached;
  }

  if (universeId === "combined") {
    const scoring = getCached<QuantMetrics[]>(SCORING_CACHE_KEY);
    if (scoring?.length && !isUniverseFundamentallySparse(scoring)) {
      triggerFullUniverseBackground();
      if (cached?.length) return cached;
      return scoring;
    }
  }

  await enrichFullUniverse(universeId);
  return getCached<QuantMetrics[]>(cacheKey) ?? [];
}

export async function getStrategyOverviews(options?: {
  includeEntry?: boolean;
}): Promise<StrategyOverviewItem[]> {
  const includeEntry = options?.includeEntry !== false;
  const cachedPeek = peekCached<StrategyOverviewItem[]>(OVERVIEW_CACHE_KEY);

  if (cachedPeek) {
    if (!cachedPeek.isFresh) {
      void getScoringUniverseMetrics().then((universe) =>
        refreshOverviewCache(universe)
      );
    }
    return mapOverviewEntry(cachedPeek.data, includeEntry);
  }

  const scoringPeek = peekCached<QuantMetrics[]>(SCORING_CACHE_KEY);
  if (scoringPeek?.data.length) {
    const overviews = computeAllStrategyOverviews(scoringPeek.data);
    if (overviews.some((o) => o.suitabilityScore > 0)) {
      setCached(OVERVIEW_CACHE_KEY, overviews, METRICS_CACHE_TTL);
      void getScoringUniverseMetrics();
      return mapOverviewEntry(overviews, includeEntry);
    }
  }

  const universe = await getScoringUniverseMetrics();
  const overviews = computeAllStrategyOverviews(universe);

  if (!includeEntry) {
    const mapped = mapOverviewEntry(overviews, false);
    if (mapped.some((o) => o.suitabilityScore > 0)) {
      setCached(OVERVIEW_CACHE_KEY, mapped, METRICS_CACHE_TTL);
    }
    return mapped;
  }

  const entryCached = getCached<
    Awaited<ReturnType<typeof getStrategyEntryEnvironments>>
  >("timing:strategy-env-v5");

  const environments =
    entryCached?.length && !isEntryEnvLikelyStale(entryCached)
      ? entryCached
      : await getStrategyEntryEnvironments(universe);

  const merged = overviews.map((o) => {
    const env = environments.find((e) => e.strategyId === o.id);
    const entryScore = env?.entryScore ?? 50;
    return {
      ...o,
      entryScore,
      entryLabel: env?.entryLabel ?? getTimingLabel(entryScore).label,
    };
  });

  const coverage = fundamentalCoverage(universe);
  if (
    merged.length > 0 &&
    !isOverviewLikelyStale(merged) &&
    !isGrowthOverviewStale(merged) &&
    !isValueOverviewStale(merged) &&
    (!includeEntry || !isEntryEnvLikelyStale(merged)) &&
    coverage >= 0.15
  ) {
    setCached(OVERVIEW_CACHE_KEY, merged, METRICS_CACHE_TTL);
  }
  return merged;
}

export function getInstantStrategyOverviews(): {
  strategies: StrategyOverviewItem[];
  warming: boolean;
} {
  const peek = peekCached<StrategyOverviewItem[]>(OVERVIEW_CACHE_KEY);
  if (peek) {
    if (!peek.isFresh) void getScoringUniverseMetrics();
    return { strategies: peek.data, warming: !peek.isFresh };
  }

  const scoring = peekCached<QuantMetrics[]>(SCORING_CACHE_KEY);
  if (scoring?.data.length) {
    const strategies = computeAllStrategyOverviews(scoring.data);
    void getScoringUniverseMetrics();
    return { strategies, warming: true };
  }

  void getScoringUniverseMetrics();
  return { strategies: getFallbackStrategyOverviews(), warming: true };
}

function mapOverviewEntry(
  overviews: StrategyOverviewItem[],
  includeEntry: boolean
): StrategyOverviewItem[] {
  if (includeEntry) return overviews;
  return overviews.map((o) => ({
    ...o,
    entryScore: -1,
    entryLabel: "…",
  }));
}

export async function getStrategyResultsWithTiming(
  strategyId: StrategyId,
  limit = 10
): Promise<StrategyResult[]> {
  const { getTimingScore } = await import("@/lib/timing/service");
  const results = await getStrategyResults(strategyId, limit);

  const enriched = await Promise.all(
    results.map(async (r) => {
      const timing = await getTimingScore(r.ticker);
      return {
        ...r,
        companyScore:
          r.companyScore && r.companyScore > 0
            ? r.companyScore
            : (timing?.companyScore ?? r.companyScore),
        timingScore: timing?.timingScore ?? r.timingScore,
      };
    })
  );

  return enriched;
}

export async function getRanking(
  strategyId: MultiFactorStrategyId | "custom" = "all-factor",
  customWeights?: FactorWeights,
  universeId: UniverseId = "combined",
  limit = 100
): Promise<RankingResponse> {
  const weights = resolveWeights(strategyId, customWeights);
  const weightsKey = JSON.stringify(weights);
  const rankingCacheKey = `ranking:v3:${strategyId}:${universeId}:${limit}:${weightsKey}`;
  const cachedRanking = getCached<RankingResponse>(rankingCacheKey);
  if (cachedRanking) return cachedRanking;

  const universe = await getUniverseMetrics(universeId);

  const entries =
    strategyId === "custom" && customWeights
      ? rankByMultiFactor(universe, weights, limit)
      : buildUniverseRanking(universe, weights, limit);

  const response: RankingResponse = {
    universe: universeId,
    universeSize: universe.length,
    strategyId,
    weights,
    entries,
    updatedAt: new Date().toISOString(),
  };

  if (entries.length > 0) {
    setCached(rankingCacheKey, response, RANKING_CACHE_TTL);
  }

  return response;
}

export async function getFactorDetail(
  ticker: string,
  universeId: UniverseId = "combined",
  weights?: FactorWeights
) {
  const w = weights ?? {
    quality: 30,
    growth: 25,
    momentum: 20,
    value: 15,
    stability: 10,
  };
  const detailCacheKey = `factor-detail:v1:${ticker}:${universeId}:${JSON.stringify(w)}`;
  const cached = getCached<Awaited<ReturnType<typeof getStockFactorDetail>>>(
    detailCacheKey
  );
  if (cached) return cached;

  const universe = await getUniverseMetrics(universeId);
  const detail = getStockFactorDetail(ticker, universe, w);
  if (detail) {
    setCached(detailCacheKey, detail, RANKING_CACHE_TTL);
  }
  return detail;
}

export async function getStrategyResults(
  strategyId: StrategyId,
  limit = 20
): Promise<StrategyResult[]> {
  const universe = await getScoringUniverseMetrics();
  return enrichAndRankStrategyResults(strategyId, universe, limit);
}

/** quick=1 — 캐시만 사용, cold start에서 빈 배열 반환 후 백그라운드 워밍 */
export function getQuickStrategyResults(
  strategyId: StrategyId,
  limit = 20
): StrategyResult[] {
  const peek = peekCached<QuantMetrics[]>(SCORING_CACHE_KEY);
  if (peek?.data.length) {
    void getScoringUniverseMetrics();
    return rankByStrategy(strategyId, peek.data, limit);
  }

  const cached = getCachedScoringUniverse();
  if (cached) {
    void getScoringUniverseMetrics();
    return rankByStrategy(strategyId, cached, limit);
  }

  void getScoringUniverseMetrics();
  return [];
}

async function enrichAndRankStrategyResults(
  strategyId: StrategyId,
  universe: QuantMetrics[],
  limit: number
): Promise<StrategyResult[]> {
  let results = rankByStrategy(strategyId, universe, limit);

  const growthLike: StrategyId[] = [
    "growth",
    "garp",
    "rate-cut",
    "ai-beneficiary",
    "datacenter",
    "power-infra",
  ];
  const valueLike: StrategyId[] = ["value", "dividend", "buffett", "rate-hike"];

  if (results.length === 0 && growthLike.includes(strategyId)) {
    await enrichGrowthFields(universe);
    persistScoringCache(universe);
    results = rankByStrategy(strategyId, universe, limit);
  }

  if (results.length === 0 && valueLike.includes(strategyId)) {
    await enrichValueFields(universe);
    persistScoringCache(universe);
    results = rankByStrategy(strategyId, universe, limit);
  }

  return results;
}

export async function runFactorBacktest(
  config: BacktestConfig
): Promise<BacktestResult> {
  const {
    period,
    rebalance,
    portfolioSize,
    weights,
    strategyId = "all-factor",
  } = config;

  const weightsKey = JSON.stringify(weights);
  const cacheKey = `factor-backtest:${strategyId}:${period}:${rebalance}:${portfolioSize}:${weightsKey}`;
  const cached = getCached<BacktestResult>(cacheKey);
  if (cached) return cached;

  const universe = await getUniverseMetrics();
  const ranked = rankByMultiFactor(universe, weights, portfolioSize);
  const portfolioTickers = ranked.map((r) => r.ticker);

  const priceMap = await fetchPricesBatch(
    [...portfolioTickers, BENCHMARK_TICKER, NASDAQ_BENCHMARK_TICKER],
    period === "5y" || period === "1y" ? "5y" : "10y"
  );

  const { stats, chart } = runBacktest(
    portfolioTickers,
    BENCHMARK_TICKER,
    NASDAQ_BENCHMARK_TICKER,
    priceMap,
    period
  );

  const strategyName =
    strategyId === "custom"
      ? "커스텀 멀티팩터"
      : getMultiFactorStrategy(strategyId).name;

  const result: BacktestResult = {
    strategyId,
    strategyName,
    period,
    periodLabel: PERIOD_LABELS[period],
    rebalance,
    rebalanceLabel: REBALANCE_LABELS[rebalance],
    portfolioSize,
    stats,
    chart,
    methodology: buildBacktestMethodology(portfolioSize, rebalance),
    selectionNote:
      "전체 유니버스 내 Percentile Rank 기반 팩터 점수로 종목을 선별합니다.",
    weights,
  };

  setCached(cacheKey, result, BACKTEST_CACHE_TTL);
  return result;
}

export async function runStrategyBacktest(
  strategyId: StrategyId,
  period: BacktestPeriod,
  rebalance: RebalanceFrequency = "quarterly",
  portfolioSize = DEFAULT_PORTFOLIO_SIZE
): Promise<BacktestResult> {
  const cacheKey = `backtest-v3:${strategyId}:${period}:${rebalance}:${portfolioSize}`;
  const cached = getCached<BacktestResult>(cacheKey);
  if (cached) return cached;

  const universe = await getUniverseMetrics();
  const ranked = rankByStrategy(strategyId, universe, portfolioSize);
  const portfolioTickers = ranked.map((r) => r.ticker);

  const priceMap = await fetchPricesBatch(
    [...portfolioTickers, BENCHMARK_TICKER, NASDAQ_BENCHMARK_TICKER],
    period === "5y" || period === "1y" ? "5y" : "10y"
  );

  const { stats, chart } = runBacktest(
    portfolioTickers,
    BENCHMARK_TICKER,
    NASDAQ_BENCHMARK_TICKER,
    priceMap,
    period
  );

  const strategy = getStrategy(strategyId);
  const result: BacktestResult = {
    strategyId,
    strategyName: strategy.name,
    period,
    periodLabel: PERIOD_LABELS[period],
    rebalance,
    rebalanceLabel: REBALANCE_LABELS[rebalance],
    portfolioSize: portfolioSize as 10 | 20 | 50 | 100,
    stats,
    chart,
    methodology: buildBacktestMethodology(portfolioSize, rebalance),
    selectionNote: getSelectionNote(strategyId),
  };

  setCached(cacheKey, result, BACKTEST_CACHE_TTL);
  return result;
}

export async function compareStrategies(
  strategyIds: (StrategyId | MultiFactorStrategyId)[],
  period: BacktestPeriod,
  rebalance: RebalanceFrequency = "quarterly",
  portfolioSize = DEFAULT_PORTFOLIO_SIZE
): Promise<CompareResult> {
  const results = await Promise.all(
    strategyIds.map(async (id) => {
      if (
        id === "value-quality" ||
        id === "quality-momentum" ||
        id === "value-momentum" ||
        id === "all-factor"
      ) {
        const strategy = getMultiFactorStrategy(id);
        return runFactorBacktest({
          period,
          rebalance,
          portfolioSize: portfolioSize as 10 | 20 | 50 | 100,
          weights: strategy.defaultWeights,
          strategyId: id,
        });
      }
      return runStrategyBacktest(
        id as StrategyId,
        period,
        rebalance,
        portfolioSize
      );
    })
  );

  return {
    period,
    rebalance,
    portfolioSize: portfolioSize as 10 | 20 | 50 | 100,
    strategies: results.map((r) => ({
      id: r.strategyId,
      name: r.strategyName,
      stats: r.stats,
      chart: r.chart,
    })),
  };
}

export async function compareWithBenchmarks(
  config: BacktestConfig
): Promise<CompareResult> {
  const factorResult = await runFactorBacktest(config);

  const priceMap = await fetchPricesBatch(
    [BENCHMARK_TICKER, NASDAQ_BENCHMARK_TICKER],
    config.period === "5y" || config.period === "1y" ? "5y" : "10y"
  );

  const spyResult = runBacktest(
    [BENCHMARK_TICKER],
    BENCHMARK_TICKER,
    NASDAQ_BENCHMARK_TICKER,
    priceMap,
    config.period
  );
  const qqqResult = runBacktest(
    [NASDAQ_BENCHMARK_TICKER],
    BENCHMARK_TICKER,
    NASDAQ_BENCHMARK_TICKER,
    priceMap,
    config.period
  );

  return {
    period: config.period,
    rebalance: config.rebalance,
    portfolioSize: config.portfolioSize,
    strategies: [
      {
        id: factorResult.strategyId,
        name: factorResult.strategyName,
        stats: factorResult.stats,
        chart: factorResult.chart,
      },
      {
        id: "spy",
        name: "S&P 500",
        stats: {
          ...spyResult.stats,
          totalReturn: spyResult.stats.benchmarkReturn,
          excessReturn: 0,
          excessVsNasdaq:
            spyResult.stats.benchmarkReturn - spyResult.stats.nasdaqReturn,
        },
        chart: spyResult.chart.map((p) => ({
          ...p,
          strategyReturn: p.benchmarkReturn,
        })),
      },
      {
        id: "qqq",
        name: "Nasdaq 100",
        stats: {
          ...qqqResult.stats,
          totalReturn: qqqResult.stats.nasdaqReturn,
          excessReturn: qqqResult.stats.nasdaqReturn - qqqResult.stats.benchmarkReturn,
          excessVsNasdaq: 0,
        },
        chart: qqqResult.chart.map((p) => ({
          ...p,
          strategyReturn: p.nasdaqReturn,
        })),
      },
    ],
  };
}

export function getMultiFactorStrategyList() {
  return MULTI_FACTOR_STRATEGIES;
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
    .map((m) => {
      const score = Math.round(
        (computeStrategyScore("value", m, universe) +
          computeStrategyScore("growth", m, universe) +
          computeStrategyScore("quality-factor", m, universe)) /
          3
      );
      return {
        ticker: m.ticker,
        name: m.name,
        score,
        strategyScore: score,
        companyScore: null,
        timingScore: null,
        tags: computeStyleTags(m, universe),
        reasons: [] as string[],
        rank: 0,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export { isMetricsAvailable } from "./metrics-service";
