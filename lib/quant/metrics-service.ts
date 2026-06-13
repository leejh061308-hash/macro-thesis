import { withTimeout } from "@/lib/timeout";
import { fetchMonthlyPrices } from "./yahoo-history";
import { UNIVERSE_NAMES } from "./universe";
import { needsFundamentalEnrich, needsGrowthEnrich, needsValueEnrich, enrichFundamentalsFromYahoo, enrichGrowthFromYahoo, enrichValueFromYahoo } from "./yahoo-fundamentals";
import type { QuantMetrics } from "./types";

const FINNHUB_TIMEOUT = 6_000;
const FINNHUB_API = "https://finnhub.io/api/v1";
const PROFILE_CONCURRENCY = 10;

function getToken(): string | null {
  return process.env.FINNHUB_API_KEY?.trim() || null;
}

async function finnhubGet<T>(path: string): Promise<T | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const url = `${FINNHUB_API}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
    const response = await withTimeout(
      fetch(url, { cache: "no-store" }),
      FINNHUB_TIMEOUT,
      "finnhub quant"
    );
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function pct(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return Math.abs(n) > 1 ? n / 100 : n;
}

function returnPct(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return Math.abs(n) > 1 ? n / 100 : n;
}

function emptyMetrics(ticker: string, name: string, marketCap: number | null): QuantMetrics {
  return {
    ticker,
    name,
    marketCap,
    peRatio: null,
    pbRatio: null,
    evToEbitda: null,
    revenueGrowth: null,
    epsGrowth: null,
    operatingMargin: null,
    netMargin: null,
    dividendYield: null,
    dividendGrowth: null,
    payoutRatio: null,
    roe: null,
    roic: null,
    debtToEquity: null,
    beta: null,
    volatility: null,
    maxDrawdown: null,
    pegRatio: null,
    freeCashFlowYield: null,
    return3m: null,
    return6m: null,
    return12m: null,
    relativeStrength: null,
    earningsStability: null,
    cashFlowStability: null,
  };
}

/** 프로필만 빠르게 — metric API 생략 (프로덕션에서 metric 누락 시 지연만 유발) */
async function fetchProfileOnly(ticker: string): Promise<QuantMetrics | null> {
  const profile = getToken()
    ? await finnhubGet<{ name?: string; marketCapitalization?: number }>(
        `/stock/profile2?symbol=${encodeURIComponent(ticker)}`
      )
    : null;

  const name = profile?.name ?? UNIVERSE_NAMES[ticker] ?? ticker;
  const marketCap =
    profile?.marketCapitalization != null
      ? profile.marketCapitalization * 1_000_000
      : null;

  return emptyMetrics(ticker, name, marketCap);
}

async function fetchOne(ticker: string): Promise<QuantMetrics | null> {
  const profileOnly = await fetchProfileOnly(ticker);
  if (!profileOnly || !getToken()) return profileOnly;

  const metrics = await finnhubGet<{ metric?: Record<string, number | null> }>(
    `/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`
  );
  const m = metrics?.metric ?? {};
  if (Object.keys(m).length === 0) return profileOnly;
  const ev = num(m.enterpriseValue);
  const ebitda = num(m.ebitda);
  const evToEbitda =
    ev != null && ebitda != null && ebitda > 0 ? ev / ebitda : null;

  const marketCap = profileOnly.marketCap;

  const peRatio = num(m.peBasic) ?? num(m.peTTM);
  const epsGrowth = pct(m.epsGrowthTTMYoy) ?? pct(m.epsGrowth3Y);
  const pegRaw = num(m.pegRatio);
  const pegRatio =
    pegRaw != null && pegRaw > 0
      ? pegRaw
      : peRatio != null && epsGrowth != null && epsGrowth > 0
        ? peRatio / (epsGrowth * 100)
        : null;

  const fcfPerShare = num(m.freeCashFlowPerShareTTM) ?? num(m.fcfPerShareTTM);
  const price =
    num(m["10DayAverageTradingVolume"]) != null
      ? null
      : num(m["52WeekHigh"]);
  const evFcf = num(m.currentEvToFreeCashFlowAnnual);
  const freeCashFlowYield =
    fcfPerShare != null && price != null && price > 0
      ? fcfPerShare / price
      : evFcf != null && evFcf > 0
        ? 1 / evFcf
        : null;

  const return12m = returnPct(m["52WeekPriceReturnDaily"]);
  const return6m = returnPct(m["26WeekPriceReturnDaily"]);
  const return3m = returnPct(m["13WeekPriceReturnDaily"]);
  const relativeStrength = returnPct(m["priceRelativeToS&P50052Week"]);

  const volatility = num(m["52WeekPriceReturnDaily.standardDeviation"]);
  const earningsStability =
    volatility != null && volatility > 0 ? 1 / volatility : null;
  const cashFlowStability =
    freeCashFlowYield != null && freeCashFlowYield > 0
      ? freeCashFlowYield
      : pct(m.operatingMarginTTM);

  return {
    ...profileOnly,
    peRatio,
    pbRatio: num(m.pbAnnual) ?? num(m.pbQuarterly),
    evToEbitda,
    revenueGrowth: pct(m.revenueGrowthTTMYoy) ?? pct(m.revenueGrowth3Y),
    epsGrowth,
    operatingMargin: pct(m.operatingMarginTTM) ?? pct(m.operatingMarginAnnual),
    netMargin: pct(m.netProfitMarginTTM) ?? pct(m.netProfitMarginAnnual),
    dividendYield:
      pct(m.dividendYieldIndicatedAnnual) ?? pct(m.currentDividendYieldTTM),
    dividendGrowth: pct(m.dividendGrowthRate5Y),
    payoutRatio: pct(m.payoutRatioAnnual),
    roe: pct(m.roeTTM) ?? pct(m.roeAnnual),
    roic: pct(m.roicTTM) ?? pct(m.roicAnnual),
    debtToEquity: num(m["totalDebt/totalEquityAnnual"]),
    beta: num(m.beta),
    volatility,
    maxDrawdown: num(m["52WeekPriceReturnDaily.maxDrawdown"])
      ? Math.abs(num(m["52WeekPriceReturnDaily.maxDrawdown"])!)
      : null,
    marketCap,
    pegRatio,
    freeCashFlowYield,
    return3m,
    return6m,
    return12m,
    relativeStrength,
    earningsStability,
    cashFlowStability,
  };
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

/** Finnhub에 모멘텀 데이터가 없을 때 Yahoo 월간 시세로 보완 */
export async function enrichMomentumFromPrices(
  metrics: QuantMetrics[],
  options?: { range?: "3y" | "5y" | "10y"; concurrency?: number }
): Promise<void> {
  const range = options?.range ?? "3y";
  const concurrency = options?.concurrency ?? 8;
  const spyPrices = await fetchMonthlyPrices("SPY", range);
  const spyReturn12m = computeTrailingReturn(spyPrices, 12);

  const needsEnrich = metrics.filter(
    (m) => m.return12m == null || m.relativeStrength == null
  );
  if (needsEnrich.length === 0) return;

  let index = 0;
  async function worker() {
    while (index < needsEnrich.length) {
      const i = index++;
      const m = needsEnrich[i];
      const prices = await fetchMonthlyPrices(m.ticker, range);
      if (prices.length < 4) continue;

      if (m.return3m == null) m.return3m = computeTrailingReturn(prices, 3);
      if (m.return6m == null) m.return6m = computeTrailingReturn(prices, 6);
      if (m.return12m == null) m.return12m = computeTrailingReturn(prices, 12);
      if (m.relativeStrength == null && m.return12m != null && spyReturn12m != null) {
        m.relativeStrength = m.return12m - spyReturn12m;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, needsEnrich.length) }, worker)
  );
}

function computeTrailingReturn(
  prices: { close: number }[],
  months: number
): number | null {
  if (prices.length <= months) return null;
  const end = prices[prices.length - 1].close;
  const start = prices[prices.length - 1 - months].close;
  if (start <= 0) return null;
  return (end - start) / start;
}

export async function fetchTickerMetrics(
  ticker: string
): Promise<QuantMetrics | null> {
  const base = await fetchOne(ticker);
  if (!base) return null;
  if (needsFundamentalEnrich(base)) {
    await enrichFundamentalsFromYahoo([base]);
  }
  return base;
}

export async function fetchUniverseProfiles(
  tickers: string[]
): Promise<QuantMetrics[]> {
  const results = await mapConcurrent(tickers, PROFILE_CONCURRENCY, fetchProfileOnly);
  return results.filter((m): m is QuantMetrics => m != null);
}

export async function enrichScoringPool(metrics: QuantMetrics[]): Promise<void> {
  await enrichFundamentalsFromYahoo(metrics, { concurrency: 6 });
  await enrichGrowthFields(metrics);
  await enrichValueFields(metrics);
  await enrichMomentumFromPrices(metrics, { range: "3y", concurrency: 6 });
}

/** 성장률만 보강 — 캐시 hit 시 lazy 호출용 */
export async function enrichGrowthFields(metrics: QuantMetrics[]): Promise<void> {
  if (metrics.every((m) => !needsGrowthEnrich(m))) return;
  await enrichGrowthFromYahoo(metrics, { concurrency: 4 });
  await enrichGrowthFromFinnhub(metrics);
}

/** PER/PBR 등 밸류에이션만 보강 — 캐시 hit 시 lazy 호출용 */
export async function enrichValueFields(metrics: QuantMetrics[]): Promise<void> {
  if (metrics.every((m) => !needsValueEnrich(m))) return;
  await enrichValueFromYahoo(metrics, { concurrency: 4 });
  await enrichValueFromFinnhub(metrics);
}

async function enrichValueFromFinnhub(metrics: QuantMetrics[]): Promise<void> {
  if (!getToken()) return;
  const needs = metrics.filter(needsValueEnrich);
  if (needs.length === 0) return;

  await mapConcurrent(needs, 6, async (m) => {
    const full = await fetchOne(m.ticker);
    if (!full) return;
    if (m.peRatio == null || m.peRatio <= 0) m.peRatio = full.peRatio;
    if (m.pbRatio == null || m.pbRatio <= 0) m.pbRatio = full.pbRatio;
    if (m.evToEbitda == null) m.evToEbitda = full.evToEbitda;
    if (m.freeCashFlowYield == null) m.freeCashFlowYield = full.freeCashFlowYield;
  });
}

async function enrichGrowthFromFinnhub(metrics: QuantMetrics[]): Promise<void> {
  if (!getToken()) return;
  const needs = metrics.filter(needsGrowthEnrich);
  if (needs.length === 0) return;

  await mapConcurrent(needs, 6, async (m) => {
    const full = await fetchOne(m.ticker);
    if (!full) return;
    if (m.revenueGrowth == null) m.revenueGrowth = full.revenueGrowth;
    if (m.epsGrowth == null) m.epsGrowth = full.epsGrowth;
    if (m.operatingMargin == null) m.operatingMargin = full.operatingMargin;
  });
}

export async function fetchUniverseMetrics(
  tickers: string[]
): Promise<QuantMetrics[]> {
  const results = await mapConcurrent(tickers, PROFILE_CONCURRENCY, fetchProfileOnly);
  return results.filter((m): m is QuantMetrics => m != null);
}

export function isMetricsAvailable(): boolean {
  return !!getToken();
}
