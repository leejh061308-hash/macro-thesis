import { withTimeout } from "@/lib/timeout";
import type { QuantMetrics } from "@/lib/quant/types";
import { fetchDailyCloses, computeRsi, sma } from "@/lib/timing/technical";
import type { ScreenerStockData } from "./types";

const FINNHUB_TIMEOUT = 8_000;
const FINNHUB_API = "https://finnhub.io/api/v1";

function getToken(): string | null {
  return process.env.FINNHUB_API_KEY?.trim() || null;
}

async function finnhubGet<T>(path: string): Promise<T | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const url = `${FINNHUB_API}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
    const response = await withTimeout(fetch(url, { cache: "no-store" }), FINNHUB_TIMEOUT, "screener finnhub");
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

function trailingReturn(closes: number[], days: number): number | null {
  if (closes.length <= days) return null;
  const end = closes[closes.length - 1];
  const start = closes[closes.length - 1 - days];
  if (start <= 0) return null;
  return (end - start) / start;
}

export async function buildScreenerStock(
  metrics: QuantMetrics,
  rawMetric?: Record<string, number | null>
): Promise<ScreenerStockData> {
  const m = rawMetric ?? {};
  const closes = await fetchDailyCloses(metrics.ticker, "1y");
  const prices = closes.map((c) => c.close);
  const price = prices.length > 0 ? prices[prices.length - 1] : null;

  const ma20 = sma(prices, 20);
  const ma60 = sma(prices, 60);
  const ma200 = sma(prices, 200);
  const rsi = computeRsi(prices);

  const fiftyTwoWeekHigh = num(m["52WeekHigh"]);
  const fiftyTwoWeekLow = num(m["52WeekLow"]);

  let near52WeekHigh: boolean | null = null;
  let near52WeekLow: boolean | null = null;
  if (price != null && fiftyTwoWeekHigh != null && fiftyTwoWeekHigh > 0) {
    near52WeekHigh = price >= fiftyTwoWeekHigh * 0.95;
  }
  if (price != null && fiftyTwoWeekLow != null && fiftyTwoWeekLow > 0) {
    near52WeekLow = price <= fiftyTwoWeekLow * 1.05;
  }

  const prevPrices = prices.slice(0, -1);
  const goldenCross =
    ma20 != null && ma60 != null && ma20 > ma60 && prevPrices.length >= 60
      ? (sma(prevPrices, 20) ?? 0) <= (sma(prevPrices, 60) ?? 0)
      : null;
  const deathCross =
    ma20 != null && ma60 != null && ma20 < ma60 && prevPrices.length >= 60
      ? (sma(prevPrices, 20) ?? 0) >= (sma(prevPrices, 60) ?? 0)
      : null;

  const quote = await finnhubGet<{ c?: number }>(
    `/quote?symbol=${encodeURIComponent(metrics.ticker)}`
  );

  return {
    ticker: metrics.ticker,
    name: metrics.name,
    price: quote?.c ?? price,
    currency: "USD",
    peRatio: metrics.peRatio,
    forwardPe: num(m.peNormalizedAnnual) ?? num(m.peForward),
    pbRatio: metrics.pbRatio,
    psr: num(m.psTTM) ?? num(m.psAnnual),
    evToEbitda: metrics.evToEbitda,
    fcfYield: metrics.freeCashFlowYield,
    revenueGrowth: metrics.revenueGrowth,
    epsGrowth: metrics.epsGrowth,
    operatingMargin: metrics.operatingMargin,
    netMargin: metrics.netMargin,
    roe: metrics.roe,
    roa: pct(m.roaTTM) ?? pct(m.roaAnnual),
    roic: metrics.roic,
    debtToEquity: metrics.debtToEquity,
    currentRatio: num(m.currentRatioAnnual) ?? num(m.currentRatioQuarterly),
    dividendYield: metrics.dividendYield,
    dividendGrowth: metrics.dividendGrowth,
    payoutRatio: metrics.payoutRatio,
    return1m: trailingReturn(prices, 21) ?? metrics.return3m,
    return3m: metrics.return3m,
    return6m: metrics.return6m,
    return12m: metrics.return12m,
    relativeStrength: metrics.relativeStrength,
    rsi,
    beta: metrics.beta,
    volatility: metrics.volatility,
    marketCap: metrics.marketCap,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    aboveMa20: price != null && ma20 != null ? price > ma20 : null,
    aboveMa60: price != null && ma60 != null ? price > ma60 : null,
    aboveMa200: price != null && ma200 != null ? price > ma200 : null,
    goldenCross,
    deathCross,
    near52WeekHigh,
    near52WeekLow,
  };
}

export async function fetchRawMetric(
  ticker: string
): Promise<Record<string, number | null> | null> {
  const data = await finnhubGet<{ metric?: Record<string, number | null> }>(
    `/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`
  );
  return data?.metric ?? null;
}
