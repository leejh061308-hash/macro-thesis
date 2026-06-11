import { NextResponse } from "next/server";
import { setCachedQuotes } from "@/lib/quote-cache";
import { listWatchlistSafe } from "@/lib/watchlist-db";
import { fetchQuote, fetchQuotes } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET() {
  const watchlist = await listWatchlistSafe();
  const tickers = watchlist.map((w) => w.ticker);

  const names = Object.fromEntries(
    watchlist.map((item) => [item.ticker, item.name])
  );

  let quotes: Awaited<ReturnType<typeof fetchQuotes>> = [];
  try {
    quotes = await fetchQuotes(tickers, names);
  } catch (error) {
    console.error("Quotes fetch error:", error);
  }

  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));
  let missingTickers = tickers.filter(
    (ticker) => !quoteMap.get(ticker)?.price
  );

  if (missingTickers.length > 0) {
    const retryQuotes = (
      await Promise.all(missingTickers.map((ticker) => fetchQuote(ticker)))
    ).filter((quote): quote is NonNullable<typeof quote> => !!quote?.price);

    if (retryQuotes.length > 0) {
      setCachedQuotes(retryQuotes);
      for (const quote of retryQuotes) {
        quoteMap.set(quote.ticker, quote);
      }
    }
    missingTickers = tickers.filter((ticker) => !quoteMap.get(ticker)?.price);
  }

  const stocks = watchlist.map((item) => {
    const quote = quoteMap.get(item.ticker);
    return {
      ticker: item.ticker,
      name: quote?.name ?? item.name,
      price: quote?.price ?? 0,
      change: quote?.change ?? 0,
      changePercent: quote?.changePercent ?? 0,
      currency: quote?.currency ?? "USD",
      session: quote?.session ?? "regular",
    };
  });

  const pricedCount = stocks.filter((stock) => stock.price > 0).length;
  const quoteStatus =
    pricedCount === 0
      ? "failed"
      : pricedCount < tickers.length
        ? "partial"
        : "ok";

  return NextResponse.json(
    { stocks, quoteStatus },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
