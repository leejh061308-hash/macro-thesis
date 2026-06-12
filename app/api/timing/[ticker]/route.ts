import { NextRequest, NextResponse } from "next/server";
import { getTimingHistory, getTimingScore } from "@/lib/timing/service";
import type { TimingHistoryPeriod } from "@/lib/timing/types";
import { isIndexTicker } from "@/lib/tickers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw);

  if (isIndexTicker(ticker)) {
    return NextResponse.json(
      { error: "지수 종목은 진입 점수를 제공하지 않습니다." },
      { status: 400 }
    );
  }

  const period = (request.nextUrl.searchParams.get("history") ??
    null) as TimingHistoryPeriod | null;

  try {
    const timing = await getTimingScore(ticker);
    if (!timing) {
      return NextResponse.json(
        { error: "진입 점수를 계산할 데이터가 부족합니다." },
        { status: 404 }
      );
    }

    const history =
      period === "6m" || period === "1y"
        ? await getTimingHistory(ticker, period)
        : undefined;

    return NextResponse.json({ timing, history });
  } catch (error) {
    console.error("[timing]", error);
    return NextResponse.json(
      { error: "진입 점수를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
