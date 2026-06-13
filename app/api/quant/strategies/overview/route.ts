import { NextRequest, NextResponse } from "next/server";
import { getStrategyOverviews } from "@/lib/quant/service";
import { isMetricsAvailable } from "@/lib/quant/metrics-service";
import { getQuantCacheStatus } from "@/lib/quant/warmup";

export async function GET(request: NextRequest) {
  try {
    const quick = request.nextUrl.searchParams.get("quick") === "1";
    const overviews = await getStrategyOverviews({ includeEntry: !quick });
    return NextResponse.json({
      strategies: overviews,
      partial: quick,
      metricsAvailable: isMetricsAvailable(),
      dataSources: {
        finnhub: isMetricsAvailable(),
        yahoo: true,
      },
      cacheStatus: getQuantCacheStatus(),
    });
  } catch (error) {
    console.error("[quant/strategies/overview]", error);
    return NextResponse.json(
      { error: "전략 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
