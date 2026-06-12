import { withTimeout } from "@/lib/timeout";
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
    ev != null && ebitda != null && ebitda > 0 ? ev / ebitda : num(m["currentEv/freeCashFlowAnnual"]);

  return {
    ticker,
    name: profile?.name ?? UNIVERSE_NAMES[ticker] ?? ticker,
    peRatio: num(m.peBasic) ?? num(m.peTTM),
    pbRatio: num(m.pbAnnual) ?? num(m.pbQuarterly),
    evToEbitda: evToEbitda != null && evToEbitda > 0 ? evToEbitda : null,
    revenueGrowth: pct(m.revenueGrowthTTMYoy) ?? pct(m.revenueGrowth3Y),
    epsGrowth: pct(m.epsGrowthTTMYoy) ?? pct(m.epsGrowth3Y),
    operatingMargin: pct(m.operatingMarginTTM) ?? pct(m.operatingMarginAnnual),
    dividendYield:
      pct(m.dividendYieldIndicatedAnnual) ?? pct(m.currentDividendYieldTTM),
    dividendGrowth: pct(m.dividendGrowthRate5Y),
    payoutRatio: pct(m.payoutRatioAnnual),
    roe: pct(m.roeTTM) ?? pct(m.roeAnnual),
    debtToEquity: num(m["totalDebt/totalEquityAnnual"]),
    beta: num(m.beta),
    volatility: num(m["52WeekPriceReturnDaily.standardDeviation"]),
    maxDrawdown: num(m["52WeekPriceReturnDaily.maxDrawdown"])
      ? Math.abs(num(m["52WeekPriceReturnDaily.maxDrawdown"])!)
      : null,
    marketCap:
      profile?.marketCapitalization != null
        ? profile.marketCapitalization * 1_000_000
        : null,
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

export async function fetchUniverseMetrics(
  tickers: string[]
): Promise<QuantMetrics[]> {
  const results = await mapConcurrent(tickers, FETCH_CONCURRENCY, fetchOne);
  return results.filter((m): m is QuantMetrics => m != null);
}

export function isMetricsAvailable(): boolean {
  return !!getToken();
}
