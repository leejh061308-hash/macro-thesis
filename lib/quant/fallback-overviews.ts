import { getStrategy } from "./strategies";
import type { StrategyOverviewItem } from "./strategy-overview";
import { BASIC_STYLE_STRATEGY_IDS } from "./constants";

export function getFallbackStrategyOverviews(): StrategyOverviewItem[] {
  return BASIC_STYLE_STRATEGY_IDS.map((id) => {
    const def = getStrategy(id);
    return {
      id,
      name: id === "quality-factor" ? "우량주 전략" : def.name,
      shortName: id === "quality-factor" ? "우량주" : def.shortName,
      description: def.description,
      icon: def.icon,
      suitabilityScore: 0,
      statusLabel: "보통",
      marketInsight: "시장 데이터를 준비 중입니다.",
      entryScore: -1,
      entryLabel: "…",
    };
  });
}
