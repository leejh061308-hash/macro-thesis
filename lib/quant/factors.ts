import type { FactorId, FactorScores, QuantMetrics } from "./types";

type FieldGetter = (m: QuantMetrics) => number | null;

interface FactorField {
  getter: FieldGetter;
  weight: number;
  lowerIsBetter: boolean;
  valid: (m: QuantMetrics) => boolean;
}

function collect(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v != null && Number.isFinite(v));
}

export function percentileRank(
  values: number[],
  value: number,
  lowerIsBetter: boolean
): number {
  if (!Number.isFinite(value) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = lowerIsBetter
    ? sorted.filter((v) => v >= value).length
    : sorted.filter((v) => v <= value).length;
  return Math.round((rank / sorted.length) * 100);
}

function scoreField(
  universe: QuantMetrics[],
  ticker: string,
  getter: FieldGetter,
  lowerIsBetter: boolean
): number {
  const values = collect(universe.map(getter));
  const mine = getter(universe.find((m) => m.ticker === ticker)!);
  if (mine == null) return 0;
  return percentileRank(values, mine, lowerIsBetter);
}

function weightedFactorScore(
  universe: QuantMetrics[],
  metrics: QuantMetrics,
  fields: FactorField[]
): number {
  const parts = fields.map((f) => ({
    score: scoreField(universe, metrics.ticker, f.getter, f.lowerIsBetter),
    weight: f.weight,
    valid: f.valid(metrics),
  }));
  const valid = parts.filter((p) => p.valid);
  if (valid.length === 0) return 0;
  const totalWeight = valid.reduce((s, p) => s + p.weight, 0);
  const sum = valid.reduce((s, p) => s + p.score * p.weight, 0);
  return Math.round(sum / totalWeight);
}

const VALUE_FIELDS: FactorField[] = [
  {
    getter: (m) => m.peRatio,
    weight: 25,
    lowerIsBetter: true,
    valid: (m) => m.peRatio != null && m.peRatio > 0,
  },
  {
    getter: (m) => m.pbRatio,
    weight: 25,
    lowerIsBetter: true,
    valid: (m) => m.pbRatio != null && m.pbRatio > 0,
  },
  {
    getter: (m) => m.evToEbitda,
    weight: 25,
    lowerIsBetter: true,
    valid: (m) => m.evToEbitda != null && m.evToEbitda > 0,
  },
  {
    getter: (m) => m.freeCashFlowYield,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.freeCashFlowYield != null,
  },
];

const QUALITY_FIELDS: FactorField[] = [
  {
    getter: (m) => m.roe,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.roe != null,
  },
  {
    getter: (m) => m.roic,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.roic != null,
  },
  {
    getter: (m) => m.operatingMargin,
    weight: 20,
    lowerIsBetter: false,
    valid: (m) => m.operatingMargin != null,
  },
  {
    getter: (m) => m.netMargin,
    weight: 15,
    lowerIsBetter: false,
    valid: (m) => m.netMargin != null,
  },
  {
    getter: (m) => m.earningsStability,
    weight: 15,
    lowerIsBetter: false,
    valid: (m) => m.earningsStability != null,
  },
];

const GROWTH_FIELDS: FactorField[] = [
  {
    getter: (m) => m.revenueGrowth,
    weight: 40,
    lowerIsBetter: false,
    valid: (m) => m.revenueGrowth != null,
  },
  {
    getter: (m) => m.epsGrowth,
    weight: 35,
    lowerIsBetter: false,
    valid: (m) => m.epsGrowth != null,
  },
  {
    getter: (m) => m.operatingMargin,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.operatingMargin != null,
  },
];

const MOMENTUM_FIELDS: FactorField[] = [
  {
    getter: (m) => m.return3m,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.return3m != null,
  },
  {
    getter: (m) => m.return6m,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.return6m != null,
  },
  {
    getter: (m) => m.return12m,
    weight: 35,
    lowerIsBetter: false,
    valid: (m) => m.return12m != null,
  },
  {
    getter: (m) => m.relativeStrength,
    weight: 15,
    lowerIsBetter: false,
    valid: (m) => m.relativeStrength != null,
  },
];

const STABILITY_FIELDS: FactorField[] = [
  {
    getter: (m) => m.volatility,
    weight: 35,
    lowerIsBetter: true,
    valid: (m) => m.volatility != null,
  },
  {
    getter: (m) => m.beta,
    weight: 30,
    lowerIsBetter: true,
    valid: (m) => m.beta != null,
  },
  {
    getter: (m) => m.maxDrawdown,
    weight: 35,
    lowerIsBetter: true,
    valid: (m) => m.maxDrawdown != null,
  },
];

export function computeValueScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, VALUE_FIELDS);
}

export function computeQualityScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, QUALITY_FIELDS);
}

export function computeGrowthScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, GROWTH_FIELDS);
}

export function computeMomentumScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, MOMENTUM_FIELDS);
}

export function computeStabilityScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, STABILITY_FIELDS);
}

export function computeAllFactorScores(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): FactorScores {
  return {
    value: computeValueScore(metrics, universe),
    quality: computeQualityScore(metrics, universe),
    growth: computeGrowthScore(metrics, universe),
    momentum: computeMomentumScore(metrics, universe),
    stability: computeStabilityScore(metrics, universe),
  };
}

export function computeFactorScore(
  factorId: FactorId,
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  switch (factorId) {
    case "value":
      return computeValueScore(metrics, universe);
    case "quality":
      return computeQualityScore(metrics, universe);
    case "growth":
      return computeGrowthScore(metrics, universe);
    case "momentum":
      return computeMomentumScore(metrics, universe);
    case "stability":
      return computeStabilityScore(metrics, universe);
  }
}

export const FACTOR_LABELS: Record<
  FactorId,
  { name: string; shortName: string; description: string }
> = {
  value: {
    name: "가치 (Value)",
    shortName: "가치",
    description: "PER, PBR, EV/EBITDA, FCF Yield 기준 상대 순위",
  },
  quality: {
    name: "퀄리티 (Quality)",
    shortName: "퀄리티",
    description: "ROE, ROIC, 마진, 이익 안정성 기준 상대 순위",
  },
  growth: {
    name: "성장 (Growth)",
    shortName: "성장",
    description: "매출·EPS·영업이익 성장률 기준 상대 순위",
  },
  momentum: {
    name: "모멘텀 (Momentum)",
    shortName: "모멘텀",
    description: "3·6·12개월 수익률 기준 상대 순위",
  },
  stability: {
    name: "안정성 (Low Volatility)",
    shortName: "안정성",
    description: "변동성, 베타, MDD 기준 상대 순위",
  },
};

export const ALL_FACTOR_IDS: FactorId[] = [
  "value",
  "quality",
  "growth",
  "momentum",
  "stability",
];
