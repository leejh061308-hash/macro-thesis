import YahooFinance from "yahoo-finance2";
import { resolveMarketQuote, type YahooQuoteLike } from "@/lib/market-quote";
import { isIndexTicker } from "@/lib/tickers";
import { withTimeout } from "@/lib/timeout";
import type {
  ChartDataPoint,
  ChartPeriod,
  SearchResult,
  StockDetail,
  StockQuote,
} from "./types";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
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

const QUOTE_TIMEOUT = 10_000;
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

export async function fetchQuote(ticker: string): Promise<StockQuote | null> {
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
  } catch {
    return null;
  }
}

export async function fetchQuotes(tickers: string[]): Promise<StockQuote[]> {
  const results = await Promise.all(tickers.map((t) => fetchQuote(t)));
  return results.filter((q): q is StockQuote => q !== null);
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
  } catch {
    return null;
  }
}

export async function fetchChartData(
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
  } catch {
    return [];
  }
}

export async function searchTickers(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    const result = await withTimeout(
      yahooFinance.search(query, {
        quotesCount: 8,
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

    return quotes
      .filter((q) => typeof q.symbol === "string")
      .map((q) => ({
        ticker: q.symbol as string,
        name: q.shortname || q.longname || (q.symbol as string),
        exchange: q.exchange ?? "",
      }));
  } catch {
    return [];
  }
}
