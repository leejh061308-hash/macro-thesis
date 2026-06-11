import { resolveMarketQuote, type YahooQuoteLike } from "@/lib/market-quote";
import { withTimeout } from "@/lib/timeout";
import type { ChartDataPoint, ChartPeriod, StockQuote } from "./types";

const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const CHART_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
] as const;

const FETCH_TIMEOUT = 18_000;
const MAX_RETRIES = 3;

const PERIOD_PARAMS: Record<
  ChartPeriod,
  { interval: string; range: string }
> = {
  "1d": { interval: "5m", range: "1d" },
  "1w": { interval: "1h", range: "5d" },
  "1m": { interval: "1d", range: "1mo" },
  "1y": { interval: "1wk", range: "1y" },
};

interface YahooChartMeta {
  currency?: string;
  symbol?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  shortName?: string;
  longName?: string;
}

interface YahooChartResult {
  meta?: YahooChartMeta;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
    }>;
  };
}

interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[] | null;
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

function quoteFromMeta(meta: YahooChartMeta, ticker: string): StockQuote | null {
  const resolved = resolveMarketQuote({
    regularMarketPrice: meta.regularMarketPrice,
    chartPreviousClose: meta.chartPreviousClose,
  } as YahooQuoteLike);

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

async function fetchChartResponse(
  ticker: string,
  interval: string,
  range: string
): Promise<YahooChartResponse> {
  const encoded = encodeURIComponent(ticker);
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const host = CHART_HOSTS[attempt % CHART_HOSTS.length];
    const url = `${host}/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includePrePost=false`;

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
        "yahoo chart"
      );

      if (!response.ok) {
        throw new Error(`Yahoo chart HTTP ${response.status}`);
      }

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
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export async function fetchDirectQuote(
  ticker: string
): Promise<StockQuote | null> {
  try {
    const json = await fetchChartResponse(ticker, "1d", "1d");
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return quoteFromMeta(meta, ticker);
  } catch (error) {
    console.error(`[yahoo-direct] quote failed for ${ticker}:`, error);
    return null;
  }
}

export async function fetchDirectQuotes(
  tickers: string[]
): Promise<StockQuote[]> {
  const quotes: StockQuote[] = [];
  const concurrency = 3;

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
  try {
    const params = PERIOD_PARAMS[period];
    const json = await fetchChartResponse(
      ticker,
      params.interval,
      params.range
    );
    const result = json.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];

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
  } catch (error) {
    console.error(
      `[yahoo-direct] chart failed for ${ticker} (${period}):`,
      error
    );
    return [];
  }
}
