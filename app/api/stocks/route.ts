import { NextResponse } from "next/server";
import { getWatchlist } from "@/lib/db";
import { fetchQuotes } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const watchlist = getWatchlist();
    const tickers = watchlist.map((w) => w.ticker);
    const quotes = await fetchQuotes(tickers);

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

    return NextResponse.json(
      { stocks },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("Stocks API error:", error);
    return NextResponse.json(
      { error: "종목 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
