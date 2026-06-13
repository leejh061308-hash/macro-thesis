import { NextRequest, NextResponse } from "next/server";
import { getFactorDetail } from "@/lib/quant/service";
import type { FactorWeights, UniverseId } from "@/lib/quant/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const params_ = request.nextUrl.searchParams;
  const universeId = (params_.get("universe") ?? "combined") as UniverseId;

  const weights: FactorWeights = {
    value: Number(params_.get("w_value") ?? 20),
    quality: Number(params_.get("w_quality") ?? 20),
    growth: Number(params_.get("w_growth") ?? 20),
    momentum: Number(params_.get("w_momentum") ?? 20),
    stability: Number(params_.get("w_stability") ?? 20),
  };

  try {
    const detail = await getFactorDetail(
      ticker.toUpperCase(),
      universeId,
      weights
    );
    if (!detail) {
      return NextResponse.json({ error: "종목을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error("[quant/factors]", error);
    return NextResponse.json(
      { error: "팩터 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
