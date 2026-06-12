import { NextRequest, NextResponse } from "next/server";
import { compareStrategies } from "@/lib/quant/service";
import type { BacktestPeriod, StrategyId } from "@/lib/quant/types";

const VALID: StrategyId[] = [
  "value",
  "growth",
  "dividend",
  "quality",
  "low-volatility",
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      strategies?: StrategyId[];
      period?: BacktestPeriod;
    };

    const strategies = (body.strategies ?? []).filter((id) =>
      VALID.includes(id)
    );
    if (strategies.length < 2) {
      return NextResponse.json(
        { error: "비교할 전략을 2개 이상 선택해주세요." },
        { status: 400 }
      );
    }

    const period = body.period ?? "3y";
    const result = await compareStrategies(strategies, period);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[quant/compare]", error);
    return NextResponse.json(
      { error: "전략 비교에 실패했습니다." },
      { status: 500 }
    );
  }
}
