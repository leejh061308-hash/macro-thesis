import type { StockQuote } from "./types";

const TTL_MS = 300_000;

const store = new Map<string, { quote: StockQuote; expiresAt: number }>();

export function getCachedQuotes(tickers: string[]): StockQuote[] {
  const now = Date.now();
  return tickers
    .map((ticker) => store.get(ticker))
    .filter(
      (entry): entry is { quote: StockQuote; expiresAt: number } =>
        !!entry && entry.expiresAt > now
    )
    .map((entry) => entry.quote);
}

export function getStaleCachedQuotes(tickers: string[]): StockQuote[] {
  return tickers
    .map((ticker) => store.get(ticker)?.quote)
    .filter((quote): quote is StockQuote => !!quote);
}

export function setCachedQuotes(quotes: StockQuote[]): void {
  const expiresAt = Date.now() + TTL_MS;
  for (const quote of quotes) {
    store.set(quote.ticker, { quote, expiresAt });
  }
}
