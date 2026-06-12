import { NextRequest, NextResponse } from "next/server";
import { runStrategyBacktest } from "@/lib/quant/service";
import type { BacktestPeriod, StrategyId } from "@/lib/quant/types";

const VALID: StrategyId[] = [
  "value",
  "growth",
  "dividend",
  "quality",
  "low-volatility",
];

const PERIODS: BacktestPeriod[] = ["1y", "3y", "5y", "10y", "max"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!VALID.includes(id as StrategyId)) {
    return NextResponse.json({ error: "Unknown strategy" }, { status: 404 });
  }

  const period = (request.nextUrl.searchParams.get("period") ??
    "3y") as BacktestPeriod;
  if (!PERIODS.includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  try {
    const result = await runStrategyBacktest(id as StrategyId, period);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[quant/backtest]", error);
    return NextResponse.json(
      { error: "백테스트 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
