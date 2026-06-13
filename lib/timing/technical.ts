import { fetchYahoo } from "@/lib/yahoo-fetch";
import { withTimeout } from "@/lib/timeout";

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
] as const;

const TIMEOUT = 15_000;

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
  };
}

export interface DailyClose {
  timestamp: number;
  close: number;
}

export async function fetchDailyCloses(
  ticker: string,
  range: "1mo" | "3mo" | "6mo" | "1y" | "2y" = "1y"
): Promise<DailyClose[]> {
  const encoded = encodeURIComponent(ticker);
  const urls = YAHOO_HOSTS.map(
    (host) =>
      `${host}/v8/finance/chart/${encoded}?interval=1d&range=${range}&includePrePost=false`
  );

  for (const url of urls) {
    try {
      const response = await withTimeout(
        fetchYahoo(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
          },
          cache: "no-store",
        }),
        TIMEOUT,
        "yahoo daily"
      );
      if (!response.ok) continue;
      const json = (await response.json()) as YahooChartResponse;
      const result = json.chart?.result?.[0];
      if (!result) continue;

      const timestamps = result.timestamp ?? [];
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      const points: DailyClose[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const close = closes[i];
        if (close == null || close <= 0) continue;
        points.push({ timestamp: timestamps[i] * 1000, close });
      }
      if (points.length > 0) return points;
    } catch {
      // next host
    }
  }
  return [];
}

export function sliceCloses(
  closes: DailyClose[],
  upToIndex?: number
): number[] {
  const slice = upToIndex != null ? closes.slice(0, upToIndex + 1) : closes;
  return slice.map((p) => p.close);
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const window = values.slice(-period);
  return window.reduce((s, v) => s + v, 0) / period;
}

export function computeRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  const start = closes.length - period;
  for (let i = start; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function trailingReturn(closes: number[], days: number): number | null {
  if (closes.length <= days) return null;
  const end = closes[closes.length - 1];
  const start = closes[closes.length - 1 - days];
  if (start <= 0) return null;
  return (end - start) / start;
}

export function computeVolatility(closes: number[], days = 60): number | null {
  if (closes.length < days + 1) return null;
  const returns: number[] = [];
  const start = closes.length - days;
  for (let i = start; i < closes.length; i++) {
    const prev = closes[i - 1];
    if (prev > 0) returns.push((closes[i] - prev) / prev);
  }
  if (returns.length === 0) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance * 252);
}

export function maxDrawdown(closes: number[], days = 252): number | null {
  const window = closes.slice(-Math.min(days, closes.length));
  if (window.length < 2) return null;
  let peak = window[0];
  let maxDd = 0;
  for (const price of window) {
    if (price > peak) peak = price;
    const dd = (price - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }
  return Math.abs(maxDd);
}
