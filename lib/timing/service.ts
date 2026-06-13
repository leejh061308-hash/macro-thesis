import {
  getCached,
  setCached,
} from "@/lib/quant/cache";
import { fetchTickerMetrics, fetchUniverseMetrics } from "@/lib/quant/metrics-service";
import { getUniverseMetrics } from "@/lib/quant/service";
import type { QuantMetrics } from "@/lib/quant/types";
import { BASIC_STYLE_STRATEGY_IDS } from "@/lib/quant/constants";
import { rankByStrategyFactor } from "@/lib/quant/strategy-factors";
import { rankByStrategy, getStrategy } from "@/lib/quant/strategies";
import { UNIVERSE_TICKERS } from "@/lib/quant/universe";
import { listWatchlistSafe } from "@/lib/watchlist-db";
import { computeCompanyScore } from "./company-score";
import {
  buildRuleInterpretation,
  computeTimingFromCloses,
} from "./calculator";
import { fetchDailyCloses } from "./technical";
import { getCompanyLabel, getTimingLabel } from "./labels";
import type {
  StrategyEntryEnvironment,
  TimingHistoryPeriod,
  TimingHistoryPoint,
  TimingOpportunity,
  TimingScoreResult,
  WatchlistTimingItem,
} from "./types";

const TIMING_CACHE_TTL = 30 * 60 * 1000;

async function getUniverseForScoring(): Promise<import("@/lib/quant/types").QuantMetrics[]> {
  const cached = getCached<import("@/lib/quant/types").QuantMetrics[]>("universe-metrics-v2");
  if (cached?.length) return cached;
  return fetchUniverseMetrics(UNIVERSE_TICKERS);
}

export async function getTimingScore(
  ticker: string
): Promise<TimingScoreResult | null> {
  const cacheKey = `timing:${ticker}`;
  const cached = getCached<TimingScoreResult>(cacheKey);
  if (cached) return cached;

  const [metrics, universe, closes] = await Promise.all([
    fetchTickerMetrics(ticker),
    getUniverseForScoring(),
    fetchDailyCloses(ticker, "1y"),
  ]);

  if (!metrics || closes.length < 30) return null;

  const universeWithSelf = universe.some((m) => m.ticker === ticker)
    ? universe
    : [...universe, metrics];

  const { score, breakdown } = computeTimingFromCloses(metrics, closes);
  const companyScore = computeCompanyScore(metrics, universeWithSelf);
  const { label, color } = getTimingLabel(score);

  const idx30d = Math.max(0, closes.length - 31);
  const prior = computeTimingFromCloses(metrics, closes, idx30d).score;

  const result: TimingScoreResult = {
    ticker,
    name: metrics.name,
    timingScore: score,
    timingLabel: label,
    timingColor: color,
    companyScore,
    companyLabel: getCompanyLabel(companyScore),
    breakdown,
    interpretation: buildRuleInterpretation(score, companyScore, breakdown, metrics),
    priorScore30d: prior,
    scoreChange30d: score - prior,
  };

  setCached(cacheKey, result, TIMING_CACHE_TTL);
  return result;
}

const HISTORY_CONFIG: Record<
  TimingHistoryPeriod,
  { range: "1mo" | "3mo" | "6mo" | "1y"; minIdx: number; step: number }
> = {
  "1m": { range: "3mo", minIdx: 25, step: 2 },
  "3m": { range: "6mo", minIdx: 40, step: 3 },
  "6m": { range: "6mo", minIdx: 60, step: 5 },
  "1y": { range: "1y", minIdx: 80, step: 7 },
};

export async function getTimingHistory(
  ticker: string,
  period: TimingHistoryPeriod
): Promise<TimingHistoryPoint[]> {
  const metrics = await fetchTickerMetrics(ticker);
  if (!metrics) return [];

  const config = HISTORY_CONFIG[period];
  const closes = await fetchDailyCloses(ticker, config.range);
  if (closes.length < config.minIdx + 5) return [];

  const points: TimingHistoryPoint[] = [];

  for (let i = config.minIdx; i < closes.length; i += config.step) {
    const { score } = computeTimingFromCloses(metrics, closes, i);
    points.push({
      date: new Date(closes[i].timestamp).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      }),
      score,
    });
  }

  const last = computeTimingFromCloses(metrics, closes);
  points.push({
    date: "현재",
    score: last.score,
  });

  return points;
}

export async function getTodaysOpportunities(
  limit = 10
): Promise<TimingOpportunity[]> {
  const cacheKey = "timing:opportunities";
  const cached = getCached<TimingOpportunity[]>(cacheKey);
  if (cached) return cached;

  const universe = await getUniverseMetrics();
  const tickers = universe.slice(0, 60).map((m) => m.ticker);
  const opportunities: TimingOpportunity[] = [];

  for (const ticker of tickers) {
    const result = await getTimingScore(ticker);
    if (!result || result.priorScore30d == null || result.scoreChange30d == null)
      continue;
    if (result.scoreChange30d >= 12) {
      opportunities.push({
        ticker: result.ticker,
        name: result.name,
        timingScore: result.timingScore,
        priorScore: result.priorScore30d,
        change: result.scoreChange30d,
        timingLabel: result.timingLabel,
      });
    }
  }

  const sorted = opportunities
    .sort((a, b) => b.change - a.change)
    .slice(0, limit);

  setCached(cacheKey, sorted, TIMING_CACHE_TTL);
  return sorted;
}

export async function getWatchlistTiming(): Promise<WatchlistTimingItem[]> {
  const watchlist = await listWatchlistSafe();
  const items: WatchlistTimingItem[] = [];

  for (const item of watchlist) {
    const result = await getTimingScore(item.ticker);
    if (!result || result.priorScore30d == null || result.scoreChange30d == null)
      continue;

    let alert: string | null = null;
    if (result.scoreChange30d >= 10 && result.timingScore >= 70) {
      alert = "관심 구간 진입";
    } else if (result.scoreChange30d <= -15 && result.priorScore30d >= 75) {
      alert = "과열 완화";
    } else if (result.timingScore <= 49) {
      alert = "관망 구간";
    }

    items.push({
      ticker: result.ticker,
      name: result.name,
      timingScore: result.timingScore,
      priorScore30d: result.priorScore30d,
      change: result.scoreChange30d,
      timingLabel: result.timingLabel,
      alert,
    });
  }

  return items.sort((a, b) => b.change - a.change);
}

export async function getStrategyEntryEnvironments(
  universeOverride?: QuantMetrics[],
  options?: { tickersPerStrategy?: number }
): Promise<StrategyEntryEnvironment[]> {
  const cacheKey = "timing:strategy-env-v3";
  const cached = getCached<StrategyEntryEnvironment[]>(cacheKey);
  if (cached?.length) return cached;

  const universe = universeOverride ?? (await getUniverseMetrics());
  const perStrategy = options?.tickersPerStrategy ?? 3;

  const results = await Promise.all(
    BASIC_STYLE_STRATEGY_IDS.map(async (strategyId) => {
      const def = getStrategy(strategyId);
      const ranked = rankByStrategy(strategyId, universe, perStrategy);
      const tickers =
        ranked.length > 0
          ? ranked.map((r) => r.ticker)
          : rankByStrategyFactor(strategyId, universe, perStrategy).map(
              (r) => r.ticker
            );

      let entryScore = 50;
      if (tickers.length > 0) {
        const timings = await Promise.all(
          tickers.map((ticker) => getTimingScore(ticker))
        );
        const valid = timings.filter(
          (t): t is TimingScoreResult => t != null
        );
        if (valid.length > 0) {
          entryScore = Math.round(
            valid.reduce((s, t) => s + t.timingScore, 0) / valid.length
          );
        }
      }

      const { label: entryLabel } = getTimingLabel(entryScore);
      return {
        strategyId,
        strategyName: def.name,
        shortName: def.shortName,
        entryScore,
        entryLabel,
      };
    })
  );

  if (results.length > 0) {
    setCached(cacheKey, results, TIMING_CACHE_TTL);
  }
  return results;
}
