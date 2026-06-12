import { NextRequest, NextResponse } from "next/server";
import { getUniverseMetrics, runScreener } from "@/lib/quant/service";
import type { ScreenerFilters } from "@/lib/quant/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScreenerFilters;
    const universe = await getUniverseMetrics();
    const results = runScreener(body, universe);
    return NextResponse.json({ results, count: results.length });
  } catch (error) {
    console.error("[quant/screener]", error);
    return NextResponse.json(
      { error: "스크리너 실행에 실패했습니다." },
      { status: 500 }
    );
  }
}
