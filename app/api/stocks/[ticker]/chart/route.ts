import { NextRequest, NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/tickers";
import { fetchChartData } from "@/lib/yahoo";
import type { ChartPeriod } from "@/lib/types";

const VALID_PERIODS: ChartPeriod[] = ["1d", "1w", "1m", "1y"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: raw } = await params;
    const ticker = normalizeTicker(raw);
    const period = request.nextUrl.searchParams.get("period") as ChartPeriod;

    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: "유효하지 않은 차트 기간입니다." },
        { status: 400 }
      );
    }

    const data = await fetchChartData(ticker, period);
    return NextResponse.json({ period, data });
  } catch (error) {
    console.error("Chart API error:", error);
    return NextResponse.json(
      { error: "차트 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
