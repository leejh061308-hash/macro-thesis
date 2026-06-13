import { NextRequest, NextResponse } from "next/server";
import { getRanking, getMultiFactorStrategyList } from "@/lib/quant/service";
import { isMetricsAvailable } from "@/lib/quant/metrics-service";
import { isValidMultiFactorId } from "@/lib/quant/index-universe";
import type {
  FactorWeights,
  MultiFactorStrategyId,
  UniverseId,
} from "@/lib/quant/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const strategyId = (params.get("strategy") ?? "all-factor") as
    | MultiFactorStrategyId
    | "custom";
  const universeId = (params.get("universe") ?? "combined") as UniverseId;
  const limit = Math.min(Number(params.get("limit") ?? 100), 100);

  let customWeights: FactorWeights | undefined;
  if (strategyId === "custom") {
    customWeights = {
      value: Number(params.get("w_value") ?? 20),
      quality: Number(params.get("w_quality") ?? 20),
      growth: Number(params.get("w_growth") ?? 20),
      momentum: Number(params.get("w_momentum") ?? 20),
      stability: Number(params.get("w_stability") ?? 20),
    };
  } else if (!isValidMultiFactorId(strategyId)) {
    return NextResponse.json({ error: "Unknown strategy" }, { status: 400 });
  }

  try {
    const ranking = await getRanking(strategyId, customWeights, universeId, limit);
    return NextResponse.json({
      ...ranking,
      strategies: getMultiFactorStrategyList(),
      metricsAvailable: isMetricsAvailable(),
    });
  } catch (error) {
    console.error("[quant/ranking]", error);
    return NextResponse.json(
      { error: "랭킹 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
