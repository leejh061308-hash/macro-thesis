import { getStrategy, rankByStrategy } from "./strategies";
import { averageTopFactorScore } from "./strategy-factors";
import type { QuantMetrics, StrategyId } from "./types";
import { BASIC_STYLE_STRATEGY_IDS } from "./constants";

export type StrategyStatus = "강세" | "보통" | "약세";

export interface StrategyOverviewItem {
  id: StrategyId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  suitabilityScore: number;
  statusLabel: StrategyStatus;
  marketInsight: string;
  entryScore: number;
  entryLabel: string;
}

function statusFromScore(score: number): StrategyStatus {
  if (score >= 80) return "강세";
  if (score >= 60) return "보통";
  return "약세";
}

function buildMarketInsight(
  strategyId: StrategyId,
  score: number,
  status: StrategyStatus
): string {
  const insights: Partial<Record<StrategyId, string>> = {
    growth:
      status === "강세"
        ? "최근 성장 팩터가 강하게 작동하고 있습니다."
        : "고성장 기업 중심으로 종목을 선별합니다.",
    value:
      status === "강세"
        ? "시장 대비 저평가 종목 비중이 높아지고 있습니다."
        : "저평가 기업 중심의 전략입니다.",
    dividend:
      status === "강세"
        ? "배당 매력도가 높은 종목이 두드러집니다."
        : "안정적 배당 수익을 추구하는 전략입니다.",
    "quality-factor":
      status === "강세"
        ? "재무 우량 종목의 상대적 강세가 이어지고 있습니다."
        : "수익성과 재무 건전성이 우수한 기업을 선별합니다.",
    momentum:
      status === "강세"
        ? "최근 주가 모멘텀이 강한 종목이 우세합니다."
        : "상승 추세가 뚜렷한 종목을 중심으로 구성합니다.",
    garp:
      status === "강세"
        ? "성장 대비 적정 가격 종목이 많이 발견됩니다."
        : "성장성과 밸류에이션을 동시에 고려합니다.",
    buffett:
      status === "강세"
        ? "장기 보유형 우량주 환경에 유리합니다."
        : "경쟁력 있는 우량 기업을 장기 관점으로 선별합니다.",
    moat:
      status === "강세"
        ? "경쟁 우위가 뚜렷한 기업들이 두각을 보입니다."
        : "넓은 경제적 해자를 보유한 기업을 선별합니다.",
  };

  const base = insights[strategyId];
  if (base) return base;
  if (score >= 80) return "현재 시장 환경에서 이 전략이 유리하게 작동하고 있습니다.";
  if (score >= 60) return "현재 시장에서 무난하게 적용 가능한 전략입니다.";
  return "현재 시장에서는 상대적으로 약한 신호입니다.";
}

export function computeStrategyOverview(
  strategyId: StrategyId,
  universe: QuantMetrics[]
): StrategyOverviewItem {
  const def = getStrategy(strategyId);
  const ranked = rankByStrategy(strategyId, universe, 10);

  const legacyAvg =
    ranked.length > 0
      ? Math.round(
          ranked.reduce((s, r) => s + r.strategyScore, 0) / ranked.length
        )
      : 0;

  const factorAvg = averageTopFactorScore(strategyId, universe, 10);
  const suitabilityScore = Math.max(legacyAvg, factorAvg);

  const statusLabel = statusFromScore(suitabilityScore);

  const displayName =
    strategyId === "quality-factor" ? "우량주 전략" : def.name;

  return {
    id: strategyId,
    name: displayName,
    shortName: strategyId === "quality-factor" ? "우량주" : def.shortName,
    description: def.description,
    icon: def.icon,
    suitabilityScore,
    statusLabel,
    marketInsight: buildMarketInsight(strategyId, suitabilityScore, statusLabel),
    entryScore: 0,
    entryLabel: "—",
  };
}

export function computeAllStrategyOverviews(
  universe: QuantMetrics[]
): StrategyOverviewItem[] {
  return BASIC_STYLE_STRATEGY_IDS.map((id) =>
    computeStrategyOverview(id, universe)
  ).sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

export function buildStrategyAiExplanation(
  overview: StrategyOverviewItem,
  topTickers: string[] = []
): string {
  const { suitabilityScore, entryScore, shortName, statusLabel } = overview;

  if (statusLabel === "강세" && entryScore >= 75) {
    return `${shortName} 전략이 강세를 보이고 있으며 진입 환경도 우호적인 상태입니다.`;
  }
  if (suitabilityScore >= 70 && entryScore < 65) {
    return `저평가 기업은 많지만 시장의 관심은 다른 스타일에 집중되고 있습니다.`;
  }
  if (entryScore >= 80 && statusLabel !== "강세") {
    return `전략 적합도는 보통이나, 추천 종목의 진입 환경은 양호한 편입니다.`;
  }
  if (statusLabel === "강세") {
    const picks = topTickers.slice(0, 3).join(", ");
    return `최근 ${shortName} 성격의 종목들이 우세한 시장 환경입니다.${picks ? ` ${picks} 등이 대표 추천 종목입니다.` : ""}`;
  }
  return `${overview.marketInsight}`;
}

export function statusColor(status: StrategyStatus): string {
  switch (status) {
    case "강세":
      return "text-emerald-400";
    case "보통":
      return "text-amber-400";
    case "약세":
      return "text-rose-400";
  }
}
