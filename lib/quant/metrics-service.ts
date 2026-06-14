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
    operatingIncomeGrowth: null,
    fcfGrowth: null,
    roa: null,
    grossMargin: null,
    fcfMargin: null,
    forwardPE: null,
    priceToFCF: null,
    return1m: null,
    position52w: null,
    maAbove20: null,
    maAbove60: null,
    maAbove200: null,
    currentRatio: null,
    dividendConsistency: null,
    priceToFfo: null,
    ffoGrowth: null,
    netInterestMargin: null,
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
    operatingIncomeGrowth: pct(m.operatingIncomeGrowthTTMYoy),
    fcfGrowth: pct(m.fcfGrowthRate5Y),
    roa: pct(m.roaTTM) ?? pct(m.roaRfy),
    grossMargin: pct(m.grossMarginTTM),
    fcfMargin: pct(m.fcfMarginTTM),
    forwardPE: num(m.peForward),
    priceToFCF: num(m.currentEvToFreeCashFlowAnnual),
    return1m: returnPct(m["4WeekPriceReturnDaily"]),
    position52w: null,
    maAbove20: null,
    maAbove60: null,
    maAbove200: null,
    currentRatio: num(m.currentRatioAnnual),
    dividendConsistency: null,
    priceToFfo: null,
    ffoGrowth: null,
    netInterestMargin: null,
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
  options?: {
    range?: "3y" | "5y" | "10y";
    concurrency?: number;
    /** 홈·전략용 — 3/6/12M 수익률만 (MA·52주·안정성 생략) */
    essentialOnly?: boolean;
    /** 시세 기반 변동성·MDD만 보강 (백그라운드용) */
    stabilityOnly?: boolean;
  }
): Promise<void> {
  const range = options?.range ?? "3y";
  const concurrency = options?.concurrency ?? 8;
  const essentialOnly = options?.essentialOnly ?? false;
  const stabilityOnly = options?.stabilityOnly ?? false;
  const spyPrices = await fetchMonthlyPrices("SPY", range);
  const spyReturn12m = computeTrailingReturn(spyPrices, 12);

  const needsEnrich = metrics.filter((m) => {
    if (stabilityOnly) {
      return m.volatility == null || m.maxDrawdown == null;
    }

    const needsMomentum =
      m.return12m == null ||
      m.return3m == null ||
      m.relativeStrength == null;

    if (essentialOnly) return needsMomentum;

    const needsExtended =
      m.return1m == null ||
      m.position52w == null ||
      m.maAbove20 == null;
    const needsStability = m.volatility == null || m.maxDrawdown == null;

    return needsMomentum || needsExtended || needsStability;
  });
  if (needsEnrich.length === 0) return;

  let index = 0;
  async function worker() {
    while (index < needsEnrich.length) {
      const i = index++;
      const m = needsEnrich[i];
      const prices = await fetchMonthlyPrices(m.ticker, range);
      if (prices.length < 4) continue;

      const end = prices[prices.length - 1].close;

      if (stabilityOnly) {
        applyStabilityFromPrices(m, prices);
        continue;
      }

      if (!essentialOnly) {
        if (m.return1m == null) m.return1m = computeTrailingReturn(prices, 1);
      }
      if (m.return3m == null) m.return3m = computeTrailingReturn(prices, 3);
      if (m.return6m == null) m.return6m = computeTrailingReturn(prices, 6);
      if (m.return12m == null) m.return12m = computeTrailingReturn(prices, 12);
      if (m.relativeStrength == null && m.return12m != null && spyReturn12m != null) {
        m.relativeStrength = m.return12m - spyReturn12m;
      }

      if (!essentialOnly) {
        applyStabilityFromPrices(m, prices);

        const recent = prices.slice(-13);
        if (recent.length > 0 && m.position52w == null) {
          const maxClose = Math.max(...recent.map((p) => p.close));
          if (maxClose > 0) m.position52w = end / maxClose;
        }

        const avg = (n: number) => {
          const slice = prices.slice(-Math.min(n, prices.length));
          if (slice.length === 0) return null;
          return slice.reduce((s, p) => s + p.close, 0) / slice.length;
        };

        if (m.maAbove20 == null) {
          const a = avg(1);
          if (a != null) m.maAbove20 = end > a ? 1 : 0;
        }
        if (m.maAbove60 == null) {
          const a = avg(3);
          if (a != null) m.maAbove60 = end > a ? 1 : 0;
        }
        if (m.maAbove200 == null) {
          const a = avg(12);
          if (a != null) m.maAbove200 = end > a ? 1 : 0;
        }
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

/** 월간 수익률 표준편차 → 연환산 변동성 */
export function computeVolatilityFromPrices(
  prices: { close: number }[],
  lookbackMonths = 24
): number | null {
  const slice = prices.slice(-Math.min(lookbackMonths + 1, prices.length));
  if (slice.length < 6) return null;

  const returns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const prev = slice[i - 1].close;
    if (prev <= 0) continue;
    returns.push((slice[i].close - prev) / prev);
  }
  if (returns.length < 4) return null;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const monthlyVol = Math.sqrt(variance);
  return monthlyVol * Math.sqrt(12);
}

/** peak-to-trough 최대 낙폭 (0~1) */
export function computeMaxDrawdownFromPrices(
  prices: { close: number }[],
  lookbackMonths = 36
): number | null {
  const slice = prices.slice(-Math.min(lookbackMonths, prices.length));
  if (slice.length < 4) return null;

  let peak = slice[0].close;
  let maxDd = 0;
  for (const p of slice) {
    if (p.close > peak) peak = p.close;
    if (peak > 0) {
      const dd = (peak - p.close) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd > 0 ? maxDd : 0;
}

function applyStabilityFromPrices(
  m: QuantMetrics,
  prices: { close: number }[]
): void {
  if (m.volatility == null) {
    const vol = computeVolatilityFromPrices(prices);
    if (vol != null) m.volatility = vol;
  }
  if (m.maxDrawdown == null) {
    const mdd = computeMaxDrawdownFromPrices(prices);
    if (mdd != null) m.maxDrawdown = mdd;
  }
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

export function deriveComputedMetrics(metrics: QuantMetrics[]): void {
  for (const m of metrics) {
    if (m.priceToFCF == null && m.freeCashFlowYield != null && m.freeCashFlowYield > 0) {
      m.priceToFCF = 1 / m.freeCashFlowYield;
    }
    if (m.dividendConsistency == null && m.earningsStability != null) {
      m.dividendConsistency = m.earningsStability;
    }
  }
}

/** Finnhub metric API — beta·변동성·모멘텀 일괄 (Yahoo 시세보다 빠름) */
export async function enrichFinnhubCoreMetrics(
  metrics: QuantMetrics[]
): Promise<void> {
  if (!getToken()) return;

  const needs = metrics.filter(
    (m) =>
      m.beta == null ||
      m.volatility == null ||
      m.maxDrawdown == null ||
      m.return3m == null ||
      m.return12m == null ||
      m.relativeStrength == null
  );
  if (needs.length === 0) return;

  await mapConcurrent(needs, 12, async (m) => {
    const full = await fetchOne(m.ticker);
    if (!full) return;
    if (m.beta == null) m.beta = full.beta;
    if (m.volatility == null) m.volatility = full.volatility;
    if (m.maxDrawdown == null) m.maxDrawdown = full.maxDrawdown;
    if (m.return3m == null) m.return3m = full.return3m;
    if (m.return6m == null) m.return6m = full.return6m;
    if (m.return12m == null) m.return12m = full.return12m;
    if (m.relativeStrength == null) m.relativeStrength = full.relativeStrength;
    if (m.peRatio == null || m.peRatio <= 0) m.peRatio = full.peRatio;
    if (m.pbRatio == null || m.pbRatio <= 0) m.pbRatio = full.pbRatio;
    if (m.roe == null) m.roe = full.roe;
    if (m.revenueGrowth == null) m.revenueGrowth = full.revenueGrowth;
    if (m.epsGrowth == null) m.epsGrowth = full.epsGrowth;
  });
}

/** 시세 기반 변동성·MDD — 백그라운드용 */
export async function enrichStabilityFromPrices(
  metrics: QuantMetrics[]
): Promise<void> {
  const needs = metrics.filter(
    (m) => m.volatility == null || m.maxDrawdown == null
  );
  if (needs.length === 0) return;
  await enrichMomentumFromPrices(needs, {
    range: "3y",
    concurrency: 6,
    stabilityOnly: true,
  });
}

/** 홈·전략 카드용 — 필수 필드만 빠르게 보강 */
export async function enrichScoringPool(metrics: QuantMetrics[]): Promise<void> {
  await Promise.all([
    enrichFundamentalsFromYahoo(metrics, { concurrency: 8 }),
    enrichFinnhubCoreMetrics(metrics),
  ]);
  await enrichGrowthFields(metrics);
  await enrichValueFields(metrics);
  await enrichMomentumFromPrices(metrics, {
    range: "3y",
    concurrency: 6,
    essentialOnly: true,
  });
  deriveComputedMetrics(metrics);
}

/** 퀀트 랭킹용 — MA·52주 등 확장 모멘텀 포함 */
export async function enrichFullScoringPool(metrics: QuantMetrics[]): Promise<void> {
  await Promise.all([
    enrichFundamentalsFromYahoo(metrics, { concurrency: 8 }),
    enrichFinnhubCoreMetrics(metrics),
  ]);
  await enrichGrowthFields(metrics);
  await enrichValueFields(metrics);
  await enrichMomentumFromPrices(metrics, { range: "3y", concurrency: 8 });
  deriveComputedMetrics(metrics);
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
