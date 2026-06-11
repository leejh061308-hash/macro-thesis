import { NextResponse } from "next/server";
import { getWatchlistSafe } from "@/lib/db";
import { fetchQuotes } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET() {
  const watchlist = getWatchlistSafe();
  const tickers = watchlist.map((w) => w.ticker);

  let quotes: Awaited<ReturnType<typeof fetchQuotes>> = [];
  try {
    quotes = await fetchQuotes(tickers);
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

  const quoteStatus =
    quotes.length === 0
      ? "failed"
      : quotes.length < tickers.length
        ? "partial"
        : "ok";

  return NextResponse.json(
    { stocks, quoteStatus },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
