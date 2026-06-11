import { withTimeout } from "@/lib/timeout";
import type { SearchResult, StockDetail, StockQuote } from "@/lib/types";

const FINNHUB_TIMEOUT = 8_000;
const FINNHUB_API = "https://finnhub.io/api/v1";

function getFinnhubToken(): string | null {
  return process.env.FINNHUB_API_KEY?.trim() || null;
}

async function finnhubGet<T>(path: string, label: string): Promise<T | null> {
  const token = getFinnhubToken();
  if (!token) return null;

  try {
    const url = `${FINNHUB_API}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
    const response = await withTimeout(
      fetch(url, { cache: "no-store" }),
      FINNHUB_TIMEOUT,
      label
    );
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error(`[finnhub] ${label} failed:`, error);
    return null;
  }
}

function finnhubSymbol(ticker: string): string | null {
  if (ticker.startsWith("^")) return ticker;
  return ticker;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function isFinnhubConfigured(): boolean {
  return !!getFinnhubToken();
}

export async function searchFinnhubTickers(query: string): Promise<SearchResult[]> {
  if (!query.trim() || !isFinnhubConfigured()) return [];

  const data = await finnhubGet<{
    result?: Array<{
      symbol?: string;
      description?: string;
      displaySymbol?: string;
      type?: string;
    }>;
  }>(`/search?q=${encodeURIComponent(query.trim())}`, "search");

  return (data?.result ?? [])
    .filter((item) => typeof item.symbol === "string")
    .slice(0, 8)
    .map((item) => ({
      ticker: item.symbol as string,
      name: item.description || item.displaySymbol || (item.symbol as string),
      exchange: item.type ?? "",
    }));
}

export async function fetchFinnhubStockDetail(
  ticker: string
): Promise<StockDetail | null> {
  const symbol = finnhubSymbol(ticker);
  if (!symbol || !isFinnhubConfigured()) return null;

  const [quoteData, profile, metrics] = await Promise.all([
    finnhubGet<{ c?: number; d?: number; dp?: number }>(
      `/quote?symbol=${encodeURIComponent(symbol)}`,
      "quote"
    ),
    finnhubGet<{
      name?: string;
      marketCapitalization?: number;
      currency?: string;
    }>(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`, "profile"),
    finnhubGet<{
      metric?: Record<string, number | null>;
      metricType?: string;
      series?: Record<string, Array<{ period: string; v: number }>>;
    }>(`/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`, "metric"),
  ]);

  if (!quoteData?.c || quoteData.c <= 0) return null;

  const metric = metrics?.metric ?? {};

  return {
    ticker,
    name: profile?.name ?? ticker,
    price: quoteData.c,
    change: quoteData.d ?? 0,
    changePercent: quoteData.dp ?? 0,
    session: "regular",
    marketCap:
      profile?.marketCapitalization != null
        ? profile.marketCapitalization * 1_000_000
        : null,
    peRatio: metric.peBasic ?? metric.peTTM ?? null,
    pbRatio: metric.pbAnnual ?? metric.pbQuarterly ?? null,
    roe: metric.roeTTM ?? metric.roeAnnual ?? null,
    revenue: metric.revenuePerShareAnnual ?? null,
    netIncome: null,
    debtToEquity: metric["totalDebt/totalEquityAnnual"] ?? null,
    dividendYield: metric.dividendYieldIndicatedAnnual ?? null,
    fiftyTwoWeekHigh: metric["52WeekHigh"] ?? null,
    fiftyTwoWeekLow: metric["52WeekLow"] ?? null,
    currency: profile?.currency ?? "USD",
  };
}

async function fetchFinnhubQuote(
  ticker: string,
  names: Record<string, string>
): Promise<StockQuote | null> {
  const symbol = finnhubSymbol(ticker);
  if (!symbol) return null;

  const data = await finnhubGet<{ c?: number; d?: number; dp?: number }>(
    `/quote?symbol=${encodeURIComponent(symbol)}`,
    "quote"
  );

  if (!data?.c || data.c <= 0) return null;

  return {
    ticker,
    name: names[ticker] ?? ticker,
    price: data.c,
    change: data.d ?? 0,
    changePercent: data.dp ?? 0,
    currency: "USD",
    session: "regular",
  };
}

export async function fetchFinnhubQuotes(
  tickers: string[],
  names: Record<string, string> = {}
): Promise<StockQuote[]> {
  if (tickers.length === 0 || !isFinnhubConfigured()) return [];

  const quotes: StockQuote[] = [];

  for (const batch of chunk(tickers, 4)) {
    const batchQuotes = await Promise.all(
      batch.map((ticker) => fetchFinnhubQuote(ticker, names))
    );
    quotes.push(
      ...batchQuotes.filter((quote): quote is StockQuote => quote !== null)
    );
  }

  return quotes;
}
