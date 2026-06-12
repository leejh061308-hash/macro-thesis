import { getCached, setCached } from "@/lib/quant/cache";
import { getUniverseMetrics } from "@/lib/quant/service";
import type { QuantMetrics } from "@/lib/quant/types";
import { computeCompanyScore } from "@/lib/timing/company-score";
import { filterMetricsPass, runScreenerEngine } from "./engine";
import { buildScreenerStock, fetchRawMetric } from "./metrics";
import { resolveTickerPool } from "./themes";
import type { AdvancedFilters, RangeFilter, ScreenerRequest, ScreenerRunResponse } from "./types";

const CACHE_TTL = 20 * 60 * 1000;
const ENRICH_LIMIT = 55;
const ENRICH_LIMIT_TECH = 70;

function inRange(value: number | null | undefined, filter?: RangeFilter): boolean {
  if (!filter) return true;
  if (value == null) return false;
  if (filter.min != null && value < filter.min) return false;
  if (filter.max != null && value > filter.max) return false;
  return true;
}

function passesMetricsAdvanced(m: QuantMetrics, f: AdvancedFilters): boolean {
  const checks: Array<[number | null | undefined, RangeFilter | undefined]> = [
    [m.peRatio, f.peRatio],
    [m.pbRatio, f.pbRatio],
    [m.evToEbitda, f.evToEbitda],
    [m.freeCashFlowYield, f.fcfYield],
    [m.revenueGrowth, f.revenueGrowth],
    [m.epsGrowth, f.epsGrowth],
    [m.operatingMargin, f.operatingMargin],
    [m.netMargin, f.netMargin],
    [m.roe, f.roe],
    [m.roic, f.roic],
    [m.debtToEquity, f.debtToEquity],
    [m.dividendYield, f.dividendYield],
    [m.dividendGrowth, f.dividendGrowth],
    [m.payoutRatio, f.payoutRatio],
    [m.return3m, f.return3m],
    [m.return6m, f.return6m],
    [m.return12m, f.return12m],
    [m.relativeStrength, f.relativeStrength],
    [m.beta, f.beta],
    [m.marketCap, f.marketCap],
  ];

  for (const [value, range] of checks) {
    if (range && !inRange(value, range)) return false;
  }

  return true;
}

function hasTechnicalAdvanced(f?: AdvancedFilters): boolean {
  if (!f) return false;
  return !!(
    f.aboveMa20 ||
    f.aboveMa60 ||
    f.aboveMa200 ||
    f.goldenCross ||
    f.deathCross ||
    f.near52WeekHigh ||
    f.near52WeekLow ||
    f.rsi ||
    f.return1m
  );
}

function rankCandidates(candidates: QuantMetrics[], universe: QuantMetrics[]): QuantMetrics[] {
  return [...candidates].sort(
    (a, b) => computeCompanyScore(b, universe) - computeCompanyScore(a, universe)
  );
}

export async function runAdvancedScreener(
  request: ScreenerRequest
): Promise<ScreenerRunResponse> {
  const universe = await getUniverseMetrics();
  if (universe.length === 0) {
    return { results: [], count: 0, appliedSummary: ["데이터 없음 — FINNHUB_API_KEY 확인"] };
  }

  const cacheKey = `screener-v3:${JSON.stringify(request)}`;
  const cached = getCached<ScreenerRunResponse>(cacheKey);
  if (cached) return cached;

  const pool = resolveTickerPool(request);
  let candidates = universe.filter((m) => {
    if (pool && !pool.has(m.ticker)) return false;
    if (!filterMetricsPass(m, universe, request)) return false;
    if (request.advanced && !passesMetricsAdvanced(m, request.advanced)) return false;
    return true;
  });

  if (candidates.length === 0 && pool) {
    candidates = universe.filter((m) => pool.has(m.ticker));
  }

  const enrichLimit = hasTechnicalAdvanced(request.advanced) ? ENRICH_LIMIT_TECH : ENRICH_LIMIT;
  const toEnrich = rankCandidates(candidates, universe).slice(0, enrichLimit);

  const enriched = await mapConcurrent(toEnrich, 3, async (m) => {
    const raw = await fetchRawMetric(m.ticker);
    return buildScreenerStock(m, raw ?? undefined);
  });

  const result = await runScreenerEngine(request, universe, enriched);
  setCached(cacheKey, result, CACHE_TTL);
  return result;
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}
