import { NextResponse } from "next/server";
import { listWatchlistSafe } from "@/lib/watchlist-db";
import { fetchQuotes } from "@/lib/yahoo";

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
        : quotes.length < tickers.length
          ? "stale"
          : "ok";

  return NextResponse.json(
    { stocks, quoteStatus },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
