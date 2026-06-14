import { NextResponse } from "next/server";
import { BASIC_STYLE_STRATEGY_IDS } from "@/lib/quant/constants";
import {
  getStrategyOverviews,
  getStrategyResults,
} from "@/lib/quant/service";
import {
  ensureQuantCacheWarm,
  getQuantCacheStatus,
} from "@/lib/quant/warmup";
import type { StrategyId } from "@/lib/quant/types";

export async function GET() {
  try {
    if (getQuantCacheStatus() !== "ready") {
      void ensureQuantCacheWarm();
    }

    const overviews = await getStrategyOverviews({ includeEntry: false });
    const strategies = overviews
      .filter((s) => BASIC_STYLE_STRATEGY_IDS.includes(s.id as StrategyId))
      .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    let recommended: Awaited<ReturnType<typeof getStrategyResults>> = [];
    let topStrategy: (typeof strategies)[number] | null = strategies[0] ?? null;

    const pickAttempts = await Promise.all(
      strategies.slice(0, 3).map(async (strategy) => ({
        strategy,
        picks: await getStrategyResults(strategy.id, 5),
      }))
    );
    const hit = pickAttempts.find((a) => a.picks.length > 0);
    if (hit) {
      recommended = hit.picks;
      topStrategy = hit.strategy;
    }

    const top3 = strategies.filter((s) => s.suitabilityScore > 0).slice(0, 3);
    const marketSummary =
      top3.length === 0
        ? "현재 시장 데이터를 분석 중입니다."
        : `현재 ${top3.map((s) => s.shortName).join("·")} 스타일이 상대적으로 유리합니다. ${top3[0].marketInsight}`;

    return NextResponse.json({
      strategies,
      topStrategy: topStrategy
        ? { id: topStrategy.id, shortName: topStrategy.shortName }
        : null,
      recommended,
      marketSummary,
      topStrategies: top3,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[home]", error);
    return NextResponse.json(
      { error: "홈 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
