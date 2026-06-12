import { NextRequest, NextResponse } from "next/server";
import { runAdvancedScreener } from "@/lib/screener/service";
import type { ScreenerRequest } from "@/lib/screener/types";
import type { ScreenerFilters } from "@/lib/quant/types";

function isLegacyFilters(body: unknown): body is ScreenerFilters {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    "maxPe" in b ||
    "minRoe" in b ||
    "maxDebtToEquity" in b ||
    "minRevenueGrowth" in b ||
    "minDividendYield" in b ||
    "minEpsGrowth" in b ||
    "minMarketCap" in b
  );
}

function legacyToRequest(filters: ScreenerFilters): ScreenerRequest {
  const advanced: ScreenerRequest["advanced"] = {};
  if (filters.maxPe != null) advanced.peRatio = { max: filters.maxPe };
  if (filters.minRoe != null) advanced.roe = { min: filters.minRoe };
  if (filters.maxDebtToEquity != null) {
    advanced.debtToEquity = { max: filters.maxDebtToEquity };
  }
  if (filters.minRevenueGrowth != null) {
    advanced.revenueGrowth = { min: filters.minRevenueGrowth };
  }
  if (filters.minDividendYield != null) {
    advanced.dividendYield = { min: filters.minDividendYield };
  }
  if (filters.minEpsGrowth != null) advanced.epsGrowth = { min: filters.minEpsGrowth };
  if (filters.minMarketCap != null) advanced.marketCap = { min: filters.minMarketCap };

  return {
    mode: "advanced",
    advanced,
    sort: "companyScore",
    sortDir: "desc",
    limit: 50,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const screenerRequest: ScreenerRequest = isLegacyFilters(body)
      ? legacyToRequest(body)
      : (body as ScreenerRequest);

    if (!screenerRequest.mode) {
      screenerRequest.mode = "advanced";
    }

    const result = await runAdvancedScreener(screenerRequest);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[quant/screener]", error);
    return NextResponse.json(
      { error: "스크리너 실행에 실패했습니다." },
      { status: 500 }
    );
  }
}
