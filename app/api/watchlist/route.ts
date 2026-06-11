import { NextRequest, NextResponse } from "next/server";
import { isPostgresConfigured } from "@/lib/postgres";
import { normalizeTicker } from "@/lib/tickers";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist-db";
import { fetchQuote } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

function requireDatabase() {
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      {
        error:
          "PostgreSQL이 설정되지 않았습니다. Railway에서 Postgres를 추가하고 DATABASE_URL을 설정해주세요.",
      },
      { status: 503 }
    );
  }
  return null;
}

export async function GET() {
  try {
    const dbError = requireDatabase();
    if (dbError) return dbError;

    const watchlist = await listWatchlist();
    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error("Watchlist GET error:", error);
    return NextResponse.json(
      { error: "관심종목을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbError = requireDatabase();
    if (dbError) return dbError;

    const body = await request.json();
    const ticker = normalizeTicker(body.ticker?.trim() ?? "");

    if (!ticker) {
      return NextResponse.json(
        { error: "티커를 입력해주세요." },
        { status: 400 }
      );
    }

    const quote = await fetchQuote(ticker);
    if (!quote) {
      return NextResponse.json(
        { error: "유효하지 않은 티커입니다." },
        { status: 404 }
      );
    }

    const added = await addToWatchlist(ticker, quote.name);
    if (!added) {
      return NextResponse.json(
        { error: "이미 관심종목에 등록된 티커입니다." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, ticker, name: quote.name });
  } catch (error) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json(
      { error: "관심종목 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const dbError = requireDatabase();
    if (dbError) return dbError;

    const paramTicker = request.nextUrl.searchParams.get("ticker");
    const body = await request.json().catch(() => ({}));
    const raw =
      (typeof body.ticker === "string" ? body.ticker : null) ??
      paramTicker ??
      "";
    const ticker = normalizeTicker(raw.trim());

    if (!ticker) {
      return NextResponse.json(
        { error: "티커를 입력해주세요." },
        { status: 400 }
      );
    }

    const removed = await removeFromWatchlist(ticker);
    if (!removed) {
      return NextResponse.json(
        { error: "관심종목에 없는 티커입니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ticker });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json(
      { error: "관심종목 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
