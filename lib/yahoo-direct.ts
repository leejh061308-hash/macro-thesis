import { resolveMarketQuote, type YahooQuoteLike } from "@/lib/market-quote";
import { withTimeout } from "@/lib/timeout";
import { fetchYahoo } from "@/lib/yahoo-fetch";
import type { ChartDataPoint, ChartPeriod, StockQuote } from "./types";

const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
] as const;

const FETCH_TIMEOUT = 12_000;
const SPARK_TIMEOUT = 12_000;
const SPARK_CHUNK_SIZE = 4;
const CHART_CONCURRENCY = 2;
const FETCH_RETRIES = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

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

async function fetchYahooJson<T>(
  urls: string[],
  timeoutMs: number,
  label: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    for (const url of urls) {
      try {
        const response = await withTimeout(
          fetchYahoo(url, {
            headers: {
              "User-Agent": YAHOO_USER_AGENT,
              Accept: "application/json",
            },
            cache: "no-store",
          }),
          timeoutMs,
          label
        );

        if (response.status === 429) {
          throw new Error(`${label} HTTP 429`);
        }

        if (!response.ok) {
          throw new Error(`${label} HTTP ${response.status}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
      }
    }

    if (attempt < FETCH_RETRIES) {
      await sleep(600 * (attempt + 1));
    }
  }

  throw lastError;
}

function encodeSymbols(tickers: string[]): string {
  return tickers.map((ticker) => encodeURIComponent(ticker)).join(",");
}

function chartQuoteUrls(ticker: string): string[] {
  const encoded = encodeURIComponent(ticker);
  return YAHOO_HOSTS.map(
    (host) =>
      `${host}/v8/finance/chart/${encoded}?interval=1d&range=1d&includePrePost=false`
  );
}

function chartDataUrls(
  ticker: string,
  interval: string,
  range: string
): string[] {
  const encoded = encodeURIComponent(ticker);
  return YAHOO_HOSTS.map(
    (host) =>
      `${host}/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includePrePost=false`
  );
}

function sparkUrls(tickers: string[], interval: string, range: string): string[] {
  const symbols = encodeSymbols(tickers);
  return YAHOO_HOSTS.map(
    (host) =>
      `${host}/v7/finance/spark?symbols=${symbols}&interval=${interval}&range=${range}`
  );
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

async function fetchChartQuote(ticker: string): Promise<StockQuote | null> {
  try {
    const json = await fetchYahooJson<YahooChartResponse>(
      chartQuoteUrls(ticker),
      FETCH_TIMEOUT,
      "yahoo chart quote"
    );
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return quoteFromMeta(meta, ticker);
  } catch (error) {
    console.error(`[yahoo-direct] chart quote failed for ${ticker}:`, error);
    return null;
  }
}

async function fetchSparkQuotes(tickers: string[]): Promise<StockQuote[]> {
  const json = await fetchYahooJson<YahooSparkResponse>(
    sparkUrls(tickers, "5m", "1d"),
    SPARK_TIMEOUT,
    "yahoo spark"
  );

  if (json.spark?.error) {
    throw new Error(json.spark.error.description ?? "Yahoo spark error");
  }

  return quotesFromSpark(json);
}

export async function fetchDirectQuote(
  ticker: string
): Promise<StockQuote | null> {
  try {
    const sparkQuotes = await fetchSparkQuotes([ticker]);
    if (sparkQuotes[0]) return sparkQuotes[0];
  } catch (error) {
    console.error(`[yahoo-direct] spark quote failed for ${ticker}:`, error);
  }

  return fetchChartQuote(ticker);
}

export async function fetchDirectQuotes(
  tickers: string[]
): Promise<StockQuote[]> {
  if (tickers.length === 0) return [];

  const quoteMap = new Map<string, StockQuote>();

  for (const batch of chunk(tickers, SPARK_CHUNK_SIZE)) {
    try {
      const sparkQuotes = await fetchSparkQuotes(batch);
      for (const quote of sparkQuotes) {
        quoteMap.set(quote.ticker, quote);
      }
    } catch (error) {
      console.error("[yahoo-direct] batch spark quote failed:", error);
    }
  }

  const missing = tickers.filter((ticker) => !quoteMap.has(ticker));
  if (missing.length > 0 && quoteMap.size > 0) {
    const chartQuotes = await mapWithConcurrency(
      missing,
      CHART_CONCURRENCY,
      fetchChartQuote
    );
    for (const quote of chartQuotes) {
      if (quote) quoteMap.set(quote.ticker, quote);
    }
  }

  return tickers
    .map((ticker) => quoteMap.get(ticker))
    .filter((quote): quote is StockQuote => !!quote);
}

export async function fetchDirectChartData(
  ticker: string,
  period: ChartPeriod
): Promise<ChartDataPoint[]> {
  const params = PERIOD_PARAMS[period];

  try {
    const json = await fetchYahooJson<YahooSparkResponse>(
      sparkUrls([ticker], params.interval, params.range),
      FETCH_TIMEOUT,
      "yahoo spark chart"
    );
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
    const json = await fetchYahooJson<YahooChartResponse>(
      chartDataUrls(ticker, params.interval, params.range),
      FETCH_TIMEOUT,
      "yahoo chart"
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
