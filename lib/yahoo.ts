import YahooFinance from "yahoo-finance2";
import { resolveMarketQuote, type YahooQuoteLike } from "@/lib/market-quote";
import { searchKoreanStockAliases } from "@/lib/korean-stocks";
import {
  formatExchangeLabel,
  isIndexTicker,
  isKoreanEquityTicker,
  isKoreanMarketTicker,
  normalizeTicker,
} from "@/lib/tickers";
import { withTimeout } from "@/lib/timeout";
import {
  getCachedQuotes,
  getStaleCachedQuotes,
  setCachedQuotes,
} from "@/lib/quote-cache";
import {
  fetchFinnhubQuotes,
  fetchFinnhubStockDetail,
  isFinnhubConfigured,
  searchFinnhubTickers,
} from "@/lib/finnhub";
import {
  fetchDirectChartData,
  fetchDirectQuote,
  fetchDirectQuotes,
} from "@/lib/yahoo-direct";
import type {
  ChartDataPoint,
  ChartPeriod,
  SearchResult,
  StockDetail,
  StockQuote,
} from "./types";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
  fetchOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  },
});

const QUOTE_FIELDS = [
  "symbol",
  "shortName",
  "longName",
  "currency",
  "regularMarketPrice",
  "regularMarketChange",
  "regularMarketChangePercent",
  "regularMarketPreviousClose",
] as const;

const QUOTE_TIMEOUT = 8_000;
const QUOTES_BUDGET_MS = 35_000;
const QUOTE_FETCH_CONCURRENCY = 4;
const DETAIL_TIMEOUT = 15_000;
const CHART_TIMEOUT = 12_000;
const SEARCH_TIMEOUT = 8_000;

const PERIOD_CONFIG: Record<
  ChartPeriod,
  { period1: () => Date; interval: "5m" | "1h" | "1d" | "1wk" }
> = {
  "1d": {
    period1: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    },
    interval: "5m",
  },
  "1w": {
    period1: () => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d;
    },
    interval: "1h",
  },
  "1m": {
    period1: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d;
    },
    interval: "1d",
  },
  "1y": {
    period1: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return d;
    },
    interval: "1wk",
  },
};

function formatChartLabel(date: Date, period: ChartPeriod): string {
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

async function mapQuotesWithConcurrency(
  tickers: string[],
  deadline: number,
  fetcher: (ticker: string) => Promise<StockQuote | null>
): Promise<StockQuote[]> {
  const quotes: StockQuote[] = [];
  let index = 0;

  async function worker() {
    while (index < tickers.length && Date.now() < deadline) {
      const current = index++;
      const quote = await fetcher(tickers[current]);
      if (quote) quotes.push(quote);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(QUOTE_FETCH_CONCURRENCY, tickers.length) },
      worker
    )
  );

  return quotes;
}

async function fetchQuotesFromLibrary(
  tickers: string[],
  deadline: number
): Promise<StockQuote[]> {
  return mapQuotesWithConcurrency(tickers, deadline, fetchQuoteFromLibrary);
}

async function fetchQuoteFromLibrary(
  ticker: string
): Promise<StockQuote | null> {
  try {
    const result = await withTimeout(
      yahooFinance.quote(ticker, { fields: [...QUOTE_FIELDS] }),
      QUOTE_TIMEOUT,
      "quote"
    );
    const resolved = resolveMarketQuote(result as YahooQuoteLike);
    if (!resolved) return null;

    return {
      ticker: result.symbol,
      name: result.shortName || result.longName || ticker,
      price: resolved.price,
      change: resolved.change,
      changePercent: resolved.changePercent,
      currency: result.currency ?? "USD",
      session: resolved.session,
    };
  } catch (error) {
    console.error(`[yahoo] library quote failed for ${ticker}:`, error);
    return null;
  }
}

async function fetchYahooQuote(ticker: string): Promise<StockQuote | null> {
  const direct = await fetchDirectQuote(ticker);
  if (direct) return direct;
  return fetchQuoteFromLibrary(ticker);
}

export async function fetchQuote(ticker: string): Promise<StockQuote | null> {
  const normalized = normalizeTicker(ticker);

  if (isFinnhubConfigured() && !isKoreanMarketTicker(normalized)) {
    const finnhubQuotes = await fetchFinnhubQuotes([normalized], {
      [normalized]: normalized,
    });
    if (finnhubQuotes[0]) return finnhubQuotes[0];
  }

  return fetchYahooQuote(normalized);
}

export async function fetchQuotes(
  tickers: string[],
  names: Record<string, string> = {}
): Promise<StockQuote[]> {
  if (tickers.length === 0) return [];

  const cached = getCachedQuotes(tickers);
  const cachedMap = new Map(cached.map((quote) => [quote.ticker, quote]));
  const staleTickers = tickers.filter((ticker) => !cachedMap.has(ticker));
  const deadline = Date.now() + QUOTES_BUDGET_MS;

  let fresh: StockQuote[] = [];
  if (staleTickers.length > 0 && Date.now() < deadline) {
    const finnhubTickers = isFinnhubConfigured()
      ? staleTickers.filter((ticker) => !isKoreanMarketTicker(ticker))
      : [];
    const koreanTickers = staleTickers.filter((ticker) =>
      isKoreanMarketTicker(ticker)
    );

    const [finnhubQuotes, koreanQuotes] = await Promise.all([
      finnhubTickers.length > 0
        ? fetchFinnhubQuotes(finnhubTickers, names)
        : Promise.resolve([]),
      koreanTickers.length > 0
        ? fetchDirectQuotes(koreanTickers)
        : Promise.resolve([]),
    ]);

    fresh = [...finnhubQuotes, ...koreanQuotes];

    const freshMap = new Map(fresh.map((quote) => [quote.ticker, quote]));
    let stillMissing = staleTickers.filter((ticker) => !freshMap.has(ticker));

    if (stillMissing.length > 0 && Date.now() < deadline) {
      const yahooQuotes = await fetchDirectQuotes(stillMissing);
      fresh = [...fresh, ...yahooQuotes];
      const yahooMap = new Map(yahooQuotes.map((quote) => [quote.ticker, quote]));
      stillMissing = stillMissing.filter((ticker) => !yahooMap.has(ticker));
    }

    if (stillMissing.length > 0 && Date.now() < deadline) {
      const libraryQuotes = await fetchQuotesFromLibrary(stillMissing, deadline);
      fresh = [...fresh, ...libraryQuotes];
    }

    if (fresh.length > 0) {
      setCachedQuotes(fresh);
    }
  }

  const merged = [
    ...cached,
    ...fresh.filter((quote) => !cachedMap.has(quote.ticker)),
  ];

  if (merged.length > 0) {
    return merged;
  }

  return getStaleCachedQuotes(tickers);
}

function buildDetailFromQuote(
  quote: YahooQuoteLike & {
    symbol?: string;
    shortName?: string;
    longName?: string;
    currency?: string;
    marketCap?: number;
    trailingPE?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  },
  ticker: string,
  extras?: Partial<StockDetail>
): StockDetail {
  const resolved = resolveMarketQuote(quote);

  return {
    ticker: quote.symbol ?? ticker,
    name: quote.shortName || quote.longName || ticker,
    price: resolved?.price ?? quote.regularMarketPrice ?? 0,
    change: resolved?.change ?? quote.regularMarketChange ?? 0,
    changePercent:
      resolved?.changePercent ?? quote.regularMarketChangePercent ?? 0,
    session: resolved?.session,
    marketCap: extras?.marketCap ?? quote.marketCap ?? null,
    peRatio: extras?.peRatio ?? quote.trailingPE ?? null,
    pbRatio: extras?.pbRatio ?? null,
    roe: extras?.roe ?? null,
    revenue: extras?.revenue ?? null,
    netIncome: extras?.netIncome ?? null,
    debtToEquity: extras?.debtToEquity ?? null,
    dividendYield: extras?.dividendYield ?? null,
    fiftyTwoWeekHigh:
      extras?.fiftyTwoWeekHigh ?? quote.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: extras?.fiftyTwoWeekLow ?? quote.fiftyTwoWeekLow ?? null,
    currency: quote.currency ?? "USD",
  };
}

function buildDetailFromStockQuote(quote: StockQuote): StockDetail {
  return {
    ticker: quote.ticker,
    name: quote.name,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    session: quote.session,
    marketCap: null,
    peRatio: null,
    pbRatio: null,
    roe: null,
    revenue: null,
    netIncome: null,
    debtToEquity: null,
    dividendYield: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    currency: quote.currency,
  };
}

export async function fetchStockDetail(
  ticker: string
): Promise<StockDetail | null> {
  try {
    const quote = await withTimeout(
      yahooFinance.quote(ticker, { fields: [...QUOTE_FIELDS] }),
      DETAIL_TIMEOUT,
      "stock detail"
    );

    if (isIndexTicker(ticker)) {
      return buildDetailFromQuote(
        quote as YahooQuoteLike & {
          symbol?: string;
          shortName?: string;
          longName?: string;
          currency?: string;
        },
        ticker
      );
    }

    const summary = await withTimeout(
      yahooFinance.quoteSummary(ticker, {
        modules: [
          "summaryDetail",
          "financialData",
          "defaultKeyStatistics",
          "incomeStatementHistory",
          "price",
        ],
      }),
      DETAIL_TIMEOUT,
      "stock summary"
    );

    const financial = summary.financialData;
    const keyStats = summary.defaultKeyStatistics;
    const summaryDetail = summary.summaryDetail;

    return buildDetailFromQuote(
      quote as YahooQuoteLike & {
        symbol?: string;
        shortName?: string;
        longName?: string;
        currency?: string;
        marketCap?: number;
        trailingPE?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
      },
      ticker,
      {
        marketCap: quote.marketCap ?? summaryDetail?.marketCap ?? null,
        peRatio:
          quote.trailingPE ??
          summaryDetail?.trailingPE ??
          keyStats?.trailingPE ??
          null,
        pbRatio: keyStats?.priceToBook ?? null,
        roe: financial?.returnOnEquity ?? null,
        revenue: financial?.totalRevenue ?? null,
        netIncome:
          summary.incomeStatementHistory?.incomeStatementHistory?.[0]
            ?.netIncome ?? null,
        debtToEquity: financial?.debtToEquity ?? null,
        dividendYield: summaryDetail?.dividendYield ?? null,
        fiftyTwoWeekHigh:
          quote.fiftyTwoWeekHigh ?? summaryDetail?.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow:
          quote.fiftyTwoWeekLow ?? summaryDetail?.fiftyTwoWeekLow ?? null,
      }
    );
  } catch (error) {
    console.error(`[yahoo] stock detail failed for ${ticker}:`, error);
  }

  if (isFinnhubConfigured() && !isKoreanMarketTicker(ticker)) {
    const finnhubDetail = await fetchFinnhubStockDetail(ticker);
    if (finnhubDetail) return finnhubDetail;
  }

  const quote = await fetchQuote(ticker);
  if (quote && quote.price > 0) {
    return buildDetailFromStockQuote(quote);
  }

  return null;
}

async function fetchChartDataFromLibrary(
  ticker: string,
  period: ChartPeriod
): Promise<ChartDataPoint[]> {
  try {
    const config = PERIOD_CONFIG[period];
    const chart = await withTimeout(
      yahooFinance.chart(ticker, {
        period1: config.period1(),
        period2: new Date(),
        interval: config.interval,
      }),
      CHART_TIMEOUT,
      "chart"
    );

    return (chart.quotes ?? [])
      .filter((point) => point.close != null)
      .map((point) => ({
        timestamp: point.date.getTime(),
        close: point.close as number,
        label: formatChartLabel(point.date, period),
      }));
  } catch (error) {
    console.error(
      `[yahoo] library chart failed for ${ticker} (${period}):`,
      error
    );
    return [];
  }
}

export async function fetchChartData(
  ticker: string,
  period: ChartPeriod
): Promise<ChartDataPoint[]> {
  const direct = await fetchDirectChartData(ticker, period);
  if (direct.length > 0) return direct;
  return fetchChartDataFromLibrary(ticker, period);
}

function isKoreanSearchQuery(query: string): boolean {
  return /[\u3131-\uD79D]/.test(query) || /^\d{6}$/.test(query.trim());
}

function rankSearchResults(
  results: SearchResult[],
  query: string
): SearchResult[] {
  const preferKorean = isKoreanSearchQuery(query);

  return [...results].sort((a, b) => {
    const aKorean = isKoreanEquityTicker(a.ticker);
    const bKorean = isKoreanEquityTicker(b.ticker);
    if (preferKorean && aKorean !== bKorean) {
      return aKorean ? -1 : 1;
    }
    return 0;
  });
}

function dedupeSearchResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const result of results) {
    if (seen.has(result.ticker)) continue;
    seen.add(result.ticker);
    unique.push(result);
  }

  return unique;
}

async function resolveKoreanTickerCandidates(
  code: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const suffix of ["KS", "KQ"] as const) {
    const ticker = `${code}.${suffix}`;
    const quote = await fetchYahooQuote(ticker);
    if (!quote) continue;

    results.push({
      ticker: quote.ticker,
      name: quote.name,
      exchange: suffix === "KS" ? "KOSPI" : "KOSDAQ",
    });
  }

  return results;
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalized = normalizeTicker(trimmed);
  let results: SearchResult[] = [];

  if (isKoreanSearchQuery(trimmed)) {
    results.push(...searchKoreanStockAliases(trimmed));
  }

  if (/^\d{6}$/.test(trimmed)) {
    results.push(...(await resolveKoreanTickerCandidates(trimmed)));
  } else if (isKoreanEquityTicker(normalized)) {
    const quote = await fetchYahooQuote(normalized);
    if (quote) {
      results.push({
        ticker: quote.ticker,
        name: quote.name,
        exchange: normalized.endsWith(".KQ") ? "KOSDAQ" : "KOSPI",
      });
    }
  }

  if (!/[\u3131-\uD79D]/.test(trimmed)) {
    try {
      const result = await withTimeout(
        yahooFinance.search(trimmed, {
          quotesCount: 12,
          newsCount: 0,
        }),
        SEARCH_TIMEOUT,
        "search"
      );

      const quotes = (result.quotes ?? []) as Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchange?: string;
      }>;

      results.push(
        ...quotes
          .filter((q) => typeof q.symbol === "string")
          .map((q) => ({
            ticker: q.symbol as string,
            name: q.shortname || q.longname || (q.symbol as string),
            exchange:
              formatExchangeLabel(q.exchange ?? "") || (q.exchange ?? ""),
          }))
      );
    } catch (error) {
      console.error("[yahoo] search failed:", error);
    }
  }

  if (/^\d{6}$/.test(trimmed)) {
    results = results.filter(
      (result) =>
        isKoreanEquityTicker(result.ticker) || result.ticker.startsWith("^")
    );
  }

  results = dedupeSearchResults(rankSearchResults(results, trimmed)).slice(0, 8);

  if (results.length > 0) return results;

  if (!isKoreanSearchQuery(trimmed)) {
    return searchFinnhubTickers(trimmed);
  }

  return [];
}
