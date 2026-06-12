import { NextResponse } from "next/server";
import { getWatchlistTiming } from "@/lib/timing/service";

export async function GET() {
  try {
    const items = await getWatchlistTiming();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[timing/watchlist]", error);
    return NextResponse.json(
      { error: "관심종목 진입 점수를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
