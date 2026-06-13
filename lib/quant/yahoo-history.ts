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

export interface PricePoint {
  timestamp: number;
  close: number;
}

export async function fetchMonthlyPrices(
  ticker: string,
  range: "3y" | "5y" | "10y" | "max" = "10y"
): Promise<PricePoint[]> {
  const yahooRange = range === "3y" ? "5y" : range;
  const encoded = encodeURIComponent(ticker);
  const urls = YAHOO_HOSTS.map(
    (host) =>
      `${host}/v8/finance/chart/${encoded}?interval=1mo&range=${yahooRange}&includePrePost=false`
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
        "yahoo history"
      );
      if (!response.ok) continue;
      const json = (await response.json()) as YahooChartResponse;
      const result = json.chart?.result?.[0];
      if (!result) continue;

      const timestamps = result.timestamp ?? [];
      const closes = result.indicators?.quote?.[0]?.close ?? [];

      const points: PricePoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const close = closes[i];
        if (close == null || close <= 0) continue;
        points.push({ timestamp: timestamps[i] * 1000, close });
      }
      if (points.length > 0) return points;
    } catch {
      // try next host
    }
  }
  return [];
}

export async function fetchPricesBatch(
  tickers: string[],
  range: "5y" | "10y" | "max" = "10y"
): Promise<Map<string, PricePoint[]>> {
  const map = new Map<string, PricePoint[]>();
  let index = 0;
  const concurrency = 3;

  async function worker() {
    while (index < tickers.length) {
      const i = index++;
      const ticker = tickers[i];
      const prices = await fetchMonthlyPrices(ticker, range);
      if (prices.length > 0) map.set(ticker, prices);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tickers.length) }, worker)
  );
  return map;
}
