import { withTimeout } from "@/lib/timeout";
import { fetchMonthlyPrices } from "./yahoo-history";
import { UNIVERSE_NAMES } from "./universe";
import type { QuantMetrics } from "./types";

const FINNHUB_TIMEOUT = 8_000;
const FINNHUB_API = "https://finnhub.io/api/v1";
const FETCH_CONCURRENCY = 4;

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

async function fetchOne(ticker: string): Promise<QuantMetrics | null> {
  const [profile, metrics] = await Promise.all([
    finnhubGet<{ name?: string; marketCapitalization?: number }>(
      `/stock/profile2?symbol=${encodeURIComponent(ticker)}`
    ),
    finnhubGet<{ metric?: Record<string, number | null> }>(
      `/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`
    ),
  ]);

  const m = metrics?.metric ?? {};
  const ev = num(m.enterpriseValue);
  const ebitda = num(m.ebitda);
  const evToEbitda =
    ev != null && ebitda != null && ebitda > 0 ? ev / ebitda : null;

  const marketCap =
    profile?.marketCapitalization != null
      ? profile.marketCapitalization * 1_000_000
      : null;

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
    ticker,
    name: profile?.name ?? UNIVERSE_NAMES[ticker] ?? ticker,
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
  metrics: QuantMetrics[]
): Promise<void> {
  const spyPrices = await fetchMonthlyPrices("SPY", "10y");
  const spyReturn12m = computeTrailingReturn(spyPrices, 12);

  const needsEnrich = metrics.filter(
    (m) => m.return12m == null || m.relativeStrength == null
  );
  if (needsEnrich.length === 0) return;

  let index = 0;
  const concurrency = 3;
  async function worker() {
    while (index < needsEnrich.length) {
      const i = index++;
      const m = needsEnrich[i];
      const prices = await fetchMonthlyPrices(m.ticker, "10y");
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
  return fetchOne(ticker);
}

export async function fetchUniverseMetrics(
  tickers: string[]
): Promise<QuantMetrics[]> {
  const results = await mapConcurrent(tickers, FETCH_CONCURRENCY, fetchOne);
  return results.filter((m): m is QuantMetrics => m != null);
}

export function isMetricsAvailable(): boolean {
  return !!getToken();
}
