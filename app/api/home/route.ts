import { NextResponse } from "next/server";
import { peekCached, setCached, STALE_GRACE_TTL } from "@/lib/quant/cache";
import { HOME_API_CACHE_KEY, HOME_API_CACHE_TTL } from "@/lib/quant/cache-keys";
import { BASIC_STYLE_STRATEGY_IDS } from "@/lib/quant/constants";
import { getFallbackStrategyOverviews } from "@/lib/quant/fallback-overviews";
import {
  getStrategyOverviews,
  getStrategyResults,
} from "@/lib/quant/service";
import {
  ensureQuantCacheWarm,
  getQuantCacheStatus,
} from "@/lib/quant/warmup";
import type { StrategyId } from "@/lib/quant/types";

type HomePayload = Awaited<ReturnType<typeof buildHomePayload>>;

let homeRefreshInFlight: Promise<HomePayload> | null = null;

export async function GET() {
  try {
    const peek = peekCached<HomePayload>(HOME_API_CACHE_KEY, STALE_GRACE_TTL);
    if (peek) {
      if (!peek.isFresh) void refreshHomeCache();
      return NextResponse.json({ ...peek.data, warming: !peek.isFresh });
    }

    void ensureQuantCacheWarm();

    const fallback = buildFallbackHomePayload();
    void refreshHomeCache();
    return NextResponse.json({ ...fallback, warming: true });
  } catch (error) {
    console.error("[home]", error);
    return NextResponse.json(
      { error: "홈 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

function buildFallbackHomePayload(): HomePayload {
  const strategies = getFallbackStrategyOverviews();
  return {
    strategies,
    topStrategy: strategies[0]
      ? { id: strategies[0].id, shortName: strategies[0].shortName }
      : null,
    recommended: [],
    marketSummary: "시장 데이터를 준비 중입니다.",
    topStrategies: strategies.slice(0, 3),
    updatedAt: new Date().toISOString(),
  };
}

async function refreshHomeCache(): Promise<HomePayload> {
  if (homeRefreshInFlight) return homeRefreshInFlight;

  homeRefreshInFlight = buildHomePayload()
    .then((payload) => {
      if (payload.strategies.length > 0) {
        setCached(HOME_API_CACHE_KEY, payload, HOME_API_CACHE_TTL);
      }
      return payload;
    })
    .finally(() => {
      homeRefreshInFlight = null;
    });

  return homeRefreshInFlight;
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
