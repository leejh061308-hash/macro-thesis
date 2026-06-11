import { withTimeout } from "@/lib/timeout";
import type { StockQuote } from "@/lib/types";

const FINNHUB_TIMEOUT = 8_000;
const FINNHUB_BASE = "https://finnhub.io/api/v1/quote";

function finnhubSymbol(ticker: string): string | null {
  if (ticker.startsWith("^")) return ticker;
  return ticker;
}

export function isFinnhubConfigured(): boolean {
  return !!process.env.FINNHUB_API_KEY?.trim();
}

export async function fetchFinnhubQuotes(
  tickers: string[],
  names: Record<string, string> = {}
): Promise<StockQuote[]> {
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (!token || tickers.length === 0) return [];

  const quotes: StockQuote[] = [];

  for (const ticker of tickers) {
    const symbol = finnhubSymbol(ticker);
    if (!symbol) continue;

    try {
      const url = `${FINNHUB_BASE}?symbol=${encodeURIComponent(symbol)}&token=${token}`;
      const response = await withTimeout(
        fetch(url, { cache: "no-store" }),
        FINNHUB_TIMEOUT,
        "finnhub quote"
      );

      if (!response.ok) continue;

      const data = (await response.json()) as {
        c?: number;
        d?: number;
        dp?: number;
      };

      if (!data.c || data.c <= 0) continue;

      quotes.push({
        ticker,
        name: names[ticker] ?? ticker,
        price: data.c,
        change: data.d ?? 0,
        changePercent: data.dp ?? 0,
        currency: "USD",
        session: "regular",
      });
    } catch (error) {
      console.error(`[finnhub] quote failed for ${ticker}:`, error);
    }
  }

  return quotes;
}
