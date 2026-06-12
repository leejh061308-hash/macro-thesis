import { NextRequest, NextResponse } from "next/server";
import { runStrategyBacktest } from "@/lib/quant/service";
import { BACKTEST_PERIODS, isValidStrategyId } from "@/lib/quant/constants";
import type { BacktestPeriod } from "@/lib/quant/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidStrategyId(id)) {
    return NextResponse.json({ error: "Unknown strategy" }, { status: 404 });
  }

  const period = (request.nextUrl.searchParams.get("period") ??
    "3y") as BacktestPeriod;
  if (!BACKTEST_PERIODS.includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  try {
    const result = await runStrategyBacktest(id, period);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[quant/backtest]", error);
    return NextResponse.json(
      { error: "백테스트 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
