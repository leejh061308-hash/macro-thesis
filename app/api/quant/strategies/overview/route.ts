import { NextResponse } from "next/server";
import { getStrategyOverviews } from "@/lib/quant/service";
import { isMetricsAvailable } from "@/lib/quant/metrics-service";

export async function GET() {
  try {
    const overviews = await getStrategyOverviews();
    return NextResponse.json({
      strategies: overviews,
      metricsAvailable: isMetricsAvailable(),
    });
  } catch (error) {
    console.error("[quant/strategies/overview]", error);
    return NextResponse.json(
      { error: "전략 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
