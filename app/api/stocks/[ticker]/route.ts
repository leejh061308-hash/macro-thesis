import { NextRequest, NextResponse } from "next/server";
import { resolveStockDisplayName } from "@/lib/stock-display";
import { isIndexTicker, normalizeTicker } from "@/lib/tickers";
import { listWatchlistSafe } from "@/lib/watchlist-db";
import { fetchStockDetail } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: raw } = await params;
    const ticker = normalizeTicker(raw);

    if (isIndexTicker(ticker)) {
      return NextResponse.json(
        { error: "지수는 차트만 제공됩니다." },
        { status: 400 }
      );
    }

    const [detail, watchlist] = await Promise.all([
      fetchStockDetail(ticker),
      listWatchlistSafe(),
    ]);

    if (!detail) {
      return NextResponse.json(
        { error: "종목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const watchlistName = watchlist.find((item) => item.ticker === ticker)?.name;
    detail.name = resolveStockDisplayName(
      ticker,
      watchlistName ?? detail.name
    );

    return NextResponse.json(detail, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Stock detail API error:", error);
    return NextResponse.json(
      { error: "종목 상세 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
