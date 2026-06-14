import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/quant/cache";
import { HOME_API_CACHE_KEY, HOME_API_CACHE_TTL } from "@/lib/quant/cache-keys";
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
    const cached = getCached<Awaited<ReturnType<typeof buildHomePayload>>>(
      HOME_API_CACHE_KEY
    );
    if (cached) {
      return NextResponse.json(cached);
    }

    if (getQuantCacheStatus() !== "ready") {
      void ensureQuantCacheWarm();
    }

    const payload = await buildHomePayload();
    if (payload.strategies.length > 0) {
      setCached(HOME_API_CACHE_KEY, payload, HOME_API_CACHE_TTL);
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[home]", error);
    return NextResponse.json(
      { error: "홈 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

async function buildHomePayload() {
  const overviews = await getStrategyOverviews({ includeEntry: false });
  const strategies = overviews
    .filter((s) => BASIC_STYLE_STRATEGY_IDS.includes(s.id as StrategyId))
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  let recommended: Awaited<ReturnType<typeof getStrategyResults>> = [];
  let topStrategy: (typeof strategies)[number] | null = strategies[0] ?? null;

  for (const strategy of strategies.slice(0, 3)) {
    const picks = await getStrategyResults(strategy.id, 5);
    if (picks.length > 0) {
      recommended = picks;
      topStrategy = strategy;
      break;
    }
  }

  const top3 = strategies.filter((s) => s.suitabilityScore > 0).slice(0, 3);
  const marketSummary =
    top3.length === 0
      ? "현재 시장 데이터를 분석 중입니다."
      : `현재 ${top3.map((s) => s.shortName).join("·")} 스타일이 상대적으로 유리합니다. ${top3[0].marketInsight}`;

  return {
    strategies,
    topStrategy: topStrategy
      ? { id: topStrategy.id, shortName: topStrategy.shortName }
      : null,
    recommended,
    marketSummary,
    topStrategies: top3,
    updatedAt: new Date().toISOString(),
  };
}
