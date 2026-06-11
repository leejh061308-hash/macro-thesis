import { resolveMarketQuote, type YahooQuoteLike } from "@/lib/market-quote";
import { withTimeout } from "@/lib/timeout";
import type { ChartDataPoint, ChartPeriod, StockQuote } from "./types";

const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
] as const;

const FETCH_TIMEOUT = 12_000;
const MAX_RETRIES = 2;

const PERIOD_PARAMS: Record<
  ChartPeriod,
  { interval: string; range: string }
> = {
  "1d": { interval: "5m", range: "1d" },
  "1w": { interval: "1h", range: "5d" },
  "1m": { interval: "1d", range: "1mo" },
  "1y": { interval: "1wk", range: "1y" },
};

interface YahooMeta {
  currency?: string;
  symbol?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  shortName?: string;
  longName?: string;
}

interface YahooSeries {
  meta?: YahooMeta;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
    }>;
  };
}

interface YahooSparkResponse {
  spark?: {
    result?: Array<{
      symbol?: string;
      response?: YahooSeries[];
    }> | null;
    error?: { description?: string } | null;
  };
}

interface YahooChartResponse {
  chart?: {
    result?: YahooSeries[] | null;
    error?: { description?: string } | null;
  };
}

function formatChartLabel(epochSec: number, period: ChartPeriod): string {
  const date = new Date(epochSec * 1000);
  if (period === "1d") {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (period === "1w") {
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    });
  }
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function quoteFromMeta(meta: YahooMeta, ticker: string): StockQuote | null {
  const resolved = resolveMarketQuote(meta as YahooQuoteLike);
  if (!resolved) return null;

  return {
    ticker: meta.symbol ?? ticker,
    name: meta.shortName || meta.longName || ticker,
    price: resolved.price,
    change: resolved.change,
    changePercent: resolved.changePercent,
    currency: meta.currency ?? "USD",
    session: resolved.session,
  };
}

function seriesToChartPoints(
  series: YahooSeries,
  period: ChartPeriod
): ChartDataPoint[] {
  const timestamps = series.timestamp ?? [];
  const closes = series.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((epochSec, index) => {
      const close = closes[index];
      if (close == null) return null;
      return {
        timestamp: epochSec * 1000,
        close,
        label: formatChartLabel(epochSec, period),
      };
    })
    .filter((point): point is ChartDataPoint => point !== null);
}

async function yahooFetch(url: string, label: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        fetch(url, {
          headers: {
            "User-Agent": YAHOO_USER_AGENT,
            Accept: "application/json",
          },
          cache: "no-store",
        }),
        FETCH_TIMEOUT,
        label
      );

      if (!response.ok) {
        throw new Error(`${label} HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

function encodeSymbols(tickers: string[]): string {
  return tickers.map((ticker) => encodeURIComponent(ticker)).join(",");
}

async function fetchSparkResponse(
  tickers: string[],
  interval: string,
  range: string
): Promise<YahooSparkResponse> {
  const symbols = encodeSymbols(tickers);
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const host = YAHOO_HOSTS[attempt % YAHOO_HOSTS.length];
    const url = `${host}/v7/finance/spark?symbols=${symbols}&interval=${interval}&range=${range}`;

    try {
      const response = await yahooFetch(url, "yahoo spark");
      const json = (await response.json()) as YahooSparkResponse;

      if (json.spark?.error) {
        throw new Error(json.spark.error.description ?? "Yahoo spark error");
      }
      if (!json.spark?.result?.length) {
        throw new Error("Yahoo spark returned no data");
      }

      return json;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

async function fetchChartResponse(
  ticker: string,
  interval: string,
  range: string
): Promise<YahooChartResponse> {
  const encoded = encodeURIComponent(ticker);
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const host = YAHOO_HOSTS[attempt % YAHOO_HOSTS.length];
    const url = `${host}/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includePrePost=false`;

    try {
      const response = await yahooFetch(url, "yahoo chart");
      const json = (await response.json()) as YahooChartResponse;

      if (json.chart?.error) {
        throw new Error(json.chart.error.description ?? "Yahoo chart error");
      }
      if (!json.chart?.result?.[0]) {
        throw new Error("Yahoo chart returned no data");
      }

      return json;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

function quotesFromSpark(json: YahooSparkResponse): StockQuote[] {
  const quotes: StockQuote[] = [];

  for (const item of json.spark?.result ?? []) {
    const ticker = item.symbol;
    const meta = item.response?.[0]?.meta;
    if (!ticker || !meta) continue;

    const quote = quoteFromMeta(meta, ticker);
    if (quote) quotes.push(quote);
  }

  return quotes;
}

export async function fetchDirectQuote(
  ticker: string
): Promise<StockQuote | null> {
  try {
    const json = await fetchSparkResponse([ticker], "5m", "1d");
    return quotesFromSpark(json)[0] ?? null;
  } catch (error) {
    console.error(`[yahoo-direct] spark quote failed for ${ticker}:`, error);

    try {
      const json = await fetchChartResponse(ticker, "1d", "1d");
      const meta = json.chart?.result?.[0]?.meta;
      if (!meta) return null;
      return quoteFromMeta(meta, ticker);
    } catch (chartError) {
      console.error(`[yahoo-direct] chart quote failed for ${ticker}:`, chartError);
      return null;
    }
  }
}

export async function fetchDirectQuotes(
  tickers: string[]
): Promise<StockQuote[]> {
  if (tickers.length === 0) return [];

  try {
    const json = await fetchSparkResponse(tickers, "5m", "1d");
    const quotes = quotesFromSpark(json);
    if (quotes.length > 0) return quotes;
  } catch (error) {
    console.error("[yahoo-direct] batch spark quote failed:", error);
  }

  const quotes: StockQuote[] = [];
  const concurrency = 2;

  for (let i = 0; i < tickers.length; i += concurrency) {
    const batch = tickers.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((ticker) => fetchDirectQuote(ticker))
    );
    for (const quote of batchResults) {
      if (quote) quotes.push(quote);
    }
  }

  return quotes;
}

export async function fetchDirectChartData(
  ticker: string,
  period: ChartPeriod
): Promise<ChartDataPoint[]> {
  const params = PERIOD_PARAMS[period];

  try {
    const json = await fetchSparkResponse([ticker], params.interval, params.range);
    const series = json.spark?.result?.[0]?.response?.[0];
    if (series) {
      const points = seriesToChartPoints(series, period);
      if (points.length > 0) return points;
    }
  } catch (error) {
    console.error(
      `[yahoo-direct] spark chart failed for ${ticker} (${period}):`,
      error
    );
  }

  try {
    const json = await fetchChartResponse(
      ticker,
      params.interval,
      params.range
    );
    const result = json.chart?.result?.[0];
    if (!result) return [];
    return seriesToChartPoints(result, period);
  } catch (error) {
    console.error(
      `[yahoo-direct] chart failed for ${ticker} (${period}):`,
      error
    );
    return [];
  }
}
