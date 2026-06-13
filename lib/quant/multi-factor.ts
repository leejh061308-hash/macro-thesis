import { computeAllFactorScores } from "./factors";
import { FACTOR_LABELS } from "./factors";
import type {
  FactorId,
  FactorWeights,
  MultiFactorStrategyDefinition,
  MultiFactorStrategyId,
  QuantMetrics,
} from "./types";

export const MULTI_FACTOR_STRATEGIES: MultiFactorStrategyDefinition[] = [
  {
    id: "value-quality",
    name: "Value + Quality",
    shortName: "가치+퀄리티",
    description: "저평가와 우량 재무를 동시에 추구하는 전략",
    aiSummary:
      "가치 팩터 50% + 퀄리티 팩터 50%로 저평가이면서 재무가 우수한 종목을 선별합니다.",
    defaultWeights: { value: 50, quality: 50 },
    icon: "◆◈",
  },
  {
    id: "quality-momentum",
    name: "Quality + Momentum",
    shortName: "퀄리티+모멘텀",
    description: "우량 기업 중 추세가 강한 종목을 선별",
    aiSummary:
      "퀄리티 팩터 50% + 모멘텀 팩터 50%로 재무 우수 + 주가 강세 종목을 선별합니다.",
    defaultWeights: { quality: 50, momentum: 50 },
    icon: "◈↗",
  },
  {
    id: "value-momentum",
    name: "Value + Momentum",
    shortName: "가치+모멘텀",
    description: "저평가 종목 중 모멘텀이 살아난 종목 선별",
    aiSummary:
      "가치 팩터 50% + 모멘텀 팩터 50%로 저평가 + 상승 추세 종목을 선별합니다.",
    defaultWeights: { value: 50, momentum: 50 },
    icon: "◆↗",
  },
  {
    id: "all-factor",
    name: "All Factor",
    shortName: "올팩터",
    description: "5대 팩터를 균등 가중치로 결합",
    aiSummary:
      "가치·퀄리티·성장·모멘텀을 각 25%씩 결합한 멀티팩터 전략입니다.",
    defaultWeights: { value: 25, quality: 25, growth: 25, momentum: 25 },
    icon: "◎",
  },
];

export function getMultiFactorStrategy(
  id: MultiFactorStrategyId
): MultiFactorStrategyDefinition {
  const strategy = MULTI_FACTOR_STRATEGIES.find((s) => s.id === id);
  if (!strategy) throw new Error(`Unknown multi-factor strategy: ${id}`);
  return strategy;
}

export function computeMultiFactorScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[],
  weights: FactorWeights
): number {
  const factors = computeAllFactorScores(metrics, universe);
  const entries = (Object.entries(weights) as [FactorId, number][]).filter(
    ([, w]) => w > 0
  );
  if (entries.length === 0) return 0;

  const totalWeight = entries.reduce((s, [, w]) => s + w, 0);
  const sum = entries.reduce(
    (s, [factor, w]) => s + factors[factor] * w,
    0
  );
  return Math.round(sum / totalWeight);
}

export function resolveWeights(
  strategyId: MultiFactorStrategyId | "custom",
  customWeights?: FactorWeights
): FactorWeights {
  if (strategyId === "custom" && customWeights) {
    return customWeights;
  }
  if (strategyId !== "custom") {
    return getMultiFactorStrategy(strategyId).defaultWeights;
  }
  return { value: 25, quality: 25, growth: 25, momentum: 25 };
}

export function buildAiFactorSummary(
  factors: ReturnType<typeof computeAllFactorScores>,
  overallScore: number
): string {
  const entries = (Object.entries(factors) as [FactorId, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const top = entries.slice(0, 2);
  const topLabel = (f: FactorId) => FACTOR_LABELS[f].shortName;

  if (overallScore >= 90) {
    return `이 종목은 전체 유니버스 상위 ${Math.max(1, 100 - overallScore + 1)}%에 속하며 ${topLabel(top[0]?.[0] ?? "quality")}와 ${topLabel(top[1]?.[0] ?? "growth")} 팩터가 강점입니다.`;
  }
  if (overallScore >= 70) {
    return `전체 유니버스 상위 ${100 - overallScore + 1}% 수준이며 ${topLabel(top[0]?.[0] ?? "quality")}(${top[0]?.[1]}), ${topLabel(top[1]?.[0] ?? "growth")}(${top[1]?.[1]}) 팩터 점수가 상대적으로 높습니다.`;
  }
  return `전체 유니버스 대비 중하위권(${overallScore}점)이며 ${topLabel(top[0]?.[0] ?? "quality")} 팩터가 상대적 강점입니다.`;
}
