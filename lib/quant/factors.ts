import type {
  DataConfidence,
  FactorId,
  FactorScores,
  QuantMetrics,
} from "./types";
import { getSectorClass, type SectorClass } from "./sector-class";

type FieldGetter = (m: QuantMetrics) => number | null;

interface FactorField {
  getter: FieldGetter;
  weight: number;
  lowerIsBetter: boolean;
  valid: (m: QuantMetrics) => boolean;
  excludeSectors?: SectorClass[];
  includeOnlySectors?: SectorClass[];
}

export interface FactorScoreMeta {
  score: number;
  available: number;
  total: number;
  confidence: DataConfidence;
}

export interface FactorScoreBundle {
  scores: FactorScores;
  confidence: Record<FactorId, DataConfidence>;
  meta: Record<FactorId, FactorScoreMeta>;
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

function fieldApplies(field: FactorField, sector: SectorClass): boolean {
  if (field.includeOnlySectors?.length) {
    return field.includeOnlySectors.includes(sector);
  }
  if (field.excludeSectors?.length) {
    return !field.excludeSectors.includes(sector);
  }
  return true;
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

function confidenceFromCounts(available: number, total: number): DataConfidence {
  if (total === 0 || available === 0) return "low";
  const ratio = available / total;
  if (ratio <= 0.25) return "low";
  if (ratio <= 0.5) return "medium";
  return "high";
}

function weightedFactorScore(
  universe: QuantMetrics[],
  metrics: QuantMetrics,
  fields: FactorField[]
): FactorScoreMeta {
  const sector = getSectorClass(metrics.ticker);
  const applicable = fields.filter((f) => fieldApplies(f, sector));

  const parts = applicable.map((f) => ({
    score: scoreField(universe, metrics.ticker, f.getter, f.lowerIsBetter),
    weight: f.weight,
    valid: f.valid(metrics),
  }));
  const valid = parts.filter((p) => p.valid);

  return metaFromWeightedParts(valid, applicable.length);
}

function emptyMeta(): FactorScoreMeta {
  return { score: 0, available: 0, total: 0, confidence: "low" };
}

function metaFromWeightedParts(
  valid: Array<{ score: number; weight: number }>,
  totalFields: number
): FactorScoreMeta {
  if (valid.length === 0) {
    return emptyMeta();
  }

  const totalWeight = valid.reduce((s, p) => s + p.weight, 0);
  const sum = valid.reduce((s, p) => s + p.score * p.weight, 0);

  return {
    score: Math.round(sum / totalWeight),
    available: valid.length,
    total: totalFields,
    confidence: confidenceFromCounts(valid.length, totalFields),
  };
}

function buildFieldLookup(
  universe: QuantMetrics[],
  field: FactorField
): Map<string, number> {
  const lookup = new Map<string, number>();
  const eligible = universe.filter(
    (m) => fieldApplies(field, getSectorClass(m.ticker)) && field.valid(m)
  );
  const values = collect(eligible.map((m) => field.getter(m)));
  if (values.length === 0) return lookup;

  for (const m of eligible) {
    const mine = field.getter(m);
    if (mine == null) continue;
    lookup.set(m.ticker, percentileRank(values, mine, field.lowerIsBetter));
  }
  return lookup;
}

function weightedFactorScoreBatch(
  universe: QuantMetrics[],
  fields: FactorField[]
): Map<string, FactorScoreMeta> {
  const lookups = fields.map((field) => buildFieldLookup(universe, field));
  const result = new Map<string, FactorScoreMeta>();

  for (const metrics of universe) {
    const sector = getSectorClass(metrics.ticker);
    const applicable = fields.filter((f) => fieldApplies(f, sector));
    const parts = fields.flatMap((field, fieldIndex) => {
      if (!fieldApplies(field, sector)) return [];
      return [{
        score: lookups[fieldIndex].get(metrics.ticker) ?? 0,
        weight: field.weight,
        valid:
          field.valid(metrics) && lookups[fieldIndex].has(metrics.ticker),
      }];
    });
    result.set(
      metrics.ticker,
      metaFromWeightedParts(
        parts.filter((p) => p.valid),
        applicable.length
      )
    );
  }

  return result;
}

const VALUE_FIELDS: FactorField[] = [
  {
    getter: (m) => m.forwardPE ?? m.peRatio,
    weight: 18,
    lowerIsBetter: true,
    valid: (m) => {
      const pe = m.forwardPE ?? m.peRatio;
      return pe != null && pe > 0;
    },
  },
  {
    getter: (m) => m.peRatio,
    weight: 18,
    lowerIsBetter: true,
    valid: (m) => m.peRatio != null && m.peRatio > 0,
  },
  {
    getter: (m) => m.pbRatio,
    weight: 18,
    lowerIsBetter: true,
    valid: (m) => m.pbRatio != null && m.pbRatio > 0,
  },
  {
    getter: (m) => m.evToEbitda,
    weight: 16,
    lowerIsBetter: true,
    valid: (m) => m.evToEbitda != null && m.evToEbitda > 0,
    excludeSectors: ["financial", "reit"],
  },
  {
    getter: (m) => m.priceToFCF,
    weight: 15,
    lowerIsBetter: true,
    valid: (m) => m.priceToFCF != null && m.priceToFCF > 0,
    excludeSectors: ["financial"],
  },
  {
    getter: (m) => m.freeCashFlowYield,
    weight: 15,
    lowerIsBetter: false,
    valid: (m) => m.freeCashFlowYield != null,
  },
  {
    getter: (m) => m.priceToFfo,
    weight: 20,
    lowerIsBetter: true,
    valid: (m) => m.priceToFfo != null && m.priceToFfo > 0,
    includeOnlySectors: ["reit"],
  },
];

const QUALITY_FIELDS: FactorField[] = [
  {
    getter: (m) => m.roe,
    weight: 16,
    lowerIsBetter: false,
    valid: (m) => m.roe != null,
  },
  {
    getter: (m) => m.roic,
    weight: 14,
    lowerIsBetter: false,
    valid: (m) => m.roic != null,
  },
  {
    getter: (m) => m.roa,
    weight: 12,
    lowerIsBetter: false,
    valid: (m) => m.roa != null,
  },
  {
    getter: (m) => m.operatingMargin,
    weight: 14,
    lowerIsBetter: false,
    valid: (m) => m.operatingMargin != null,
    excludeSectors: ["financial", "reit"],
  },
  {
    getter: (m) => m.netMargin,
    weight: 12,
    lowerIsBetter: false,
    valid: (m) => m.netMargin != null,
  },
  {
    getter: (m) => m.grossMargin,
    weight: 10,
    lowerIsBetter: false,
    valid: (m) => m.grossMargin != null,
    excludeSectors: ["financial", "reit"],
  },
  {
    getter: (m) => m.fcfMargin,
    weight: 12,
    lowerIsBetter: false,
    valid: (m) => m.fcfMargin != null,
    excludeSectors: ["financial"],
  },
  {
    getter: (m) => m.debtToEquity,
    weight: 10,
    lowerIsBetter: true,
    valid: (m) => m.debtToEquity != null && m.debtToEquity >= 0,
    excludeSectors: ["financial"],
  },
  {
    getter: (m) => m.netInterestMargin,
    weight: 18,
    lowerIsBetter: false,
    valid: (m) => m.netInterestMargin != null,
    includeOnlySectors: ["financial"],
  },
];

const GROWTH_FIELDS: FactorField[] = [
  {
    getter: (m) => m.revenueGrowth,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.revenueGrowth != null,
  },
  {
    getter: (m) => m.epsGrowth,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.epsGrowth != null,
  },
  {
    getter: (m) => m.operatingIncomeGrowth,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.operatingIncomeGrowth != null,
    excludeSectors: ["financial"],
  },
  {
    getter: (m) => m.fcfGrowth,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.fcfGrowth != null,
    excludeSectors: ["financial"],
  },
  {
    getter: (m) => m.ffoGrowth,
    weight: 30,
    lowerIsBetter: false,
    valid: (m) => m.ffoGrowth != null,
    includeOnlySectors: ["reit"],
  },
];

const MOMENTUM_FIELDS: FactorField[] = [
  {
    getter: (m) => m.return1m,
    weight: 12,
    lowerIsBetter: false,
    valid: (m) => m.return1m != null,
  },
  {
    getter: (m) => m.return3m,
    weight: 14,
    lowerIsBetter: false,
    valid: (m) => m.return3m != null,
  },
  {
    getter: (m) => m.return6m,
    weight: 14,
    lowerIsBetter: false,
    valid: (m) => m.return6m != null,
  },
  {
    getter: (m) => m.return12m,
    weight: 16,
    lowerIsBetter: false,
    valid: (m) => m.return12m != null,
  },
  {
    getter: (m) => m.position52w,
    weight: 14,
    lowerIsBetter: false,
    valid: (m) => m.position52w != null,
  },
  {
    getter: (m) => m.maAbove20,
    weight: 10,
    lowerIsBetter: false,
    valid: (m) => m.maAbove20 != null,
  },
  {
    getter: (m) => m.maAbove60,
    weight: 10,
    lowerIsBetter: false,
    valid: (m) => m.maAbove60 != null,
  },
  {
    getter: (m) => m.maAbove200,
    weight: 10,
    lowerIsBetter: false,
    valid: (m) => m.maAbove200 != null,
  },
];

const STABILITY_FIELDS: FactorField[] = [
  {
    getter: (m) => m.beta,
    weight: 20,
    lowerIsBetter: true,
    valid: (m) => m.beta != null,
  },
  {
    getter: (m) => m.volatility,
    weight: 20,
    lowerIsBetter: true,
    valid: (m) => m.volatility != null,
  },
  {
    getter: (m) => m.maxDrawdown,
    weight: 20,
    lowerIsBetter: true,
    valid: (m) => m.maxDrawdown != null,
  },
  {
    getter: (m) => m.debtToEquity,
    weight: 20,
    lowerIsBetter: true,
    valid: (m) => m.debtToEquity != null && m.debtToEquity >= 0,
    excludeSectors: ["financial"],
  },
  {
    getter: (m) => m.currentRatio,
    weight: 20,
    lowerIsBetter: false,
    valid: (m) => m.currentRatio != null && m.currentRatio > 0,
    excludeSectors: ["financial", "reit"],
  },
];

const DIVIDEND_FIELDS: FactorField[] = [
  {
    getter: (m) => m.dividendYield,
    weight: 30,
    lowerIsBetter: false,
    valid: (m) => m.dividendYield != null && m.dividendYield > 0,
  },
  {
    getter: (m) => m.dividendGrowth,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.dividendGrowth != null,
  },
  {
    getter: (m) => m.payoutRatio,
    weight: 20,
    lowerIsBetter: true,
    valid: (m) =>
      m.payoutRatio != null && m.payoutRatio > 0 && m.payoutRatio <= 1.5,
  },
  {
    getter: (m) => m.dividendConsistency,
    weight: 25,
    lowerIsBetter: false,
    valid: (m) => m.dividendConsistency != null,
  },
];

function applyDividendPayoutPenalty(
  meta: FactorScoreMeta,
  metrics: QuantMetrics
): FactorScoreMeta {
  if (meta.score <= 0) return meta;
  const payout = metrics.payoutRatio;
  if (payout == null) return meta;

  let multiplier = 1;
  if (payout > 0.9) multiplier = 0.65;
  else if (payout > 0.75) multiplier = 0.82;

  return {
    ...meta,
    score: Math.round(meta.score * multiplier),
  };
}

export function computeValueScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, VALUE_FIELDS).score;
}

export function computeQualityScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, QUALITY_FIELDS).score;
}

export function computeGrowthScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, GROWTH_FIELDS).score;
}

export function computeMomentumScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, MOMENTUM_FIELDS).score;
}

export function computeStabilityScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  return weightedFactorScore(universe, metrics, STABILITY_FIELDS).score;
}

export function computeDividendScore(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  const meta = weightedFactorScore(universe, metrics, DIVIDEND_FIELDS);
  return applyDividendPayoutPenalty(meta, metrics).score;
}

export function computeAllFactorScores(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): FactorScores {
  return computeFactorBundle(metrics, universe).scores;
}

export function computeFactorBundle(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): FactorScoreBundle {
  return computeAllFactorBundles(universe).get(metrics.ticker)!;
}

export function computeAllFactorBundles(
  universe: QuantMetrics[]
): Map<string, FactorScoreBundle> {
  const valueMap = weightedFactorScoreBatch(universe, VALUE_FIELDS);
  const qualityMap = weightedFactorScoreBatch(universe, QUALITY_FIELDS);
  const growthMap = weightedFactorScoreBatch(universe, GROWTH_FIELDS);
  const momentumMap = weightedFactorScoreBatch(universe, MOMENTUM_FIELDS);
  const stabilityMap = weightedFactorScoreBatch(universe, STABILITY_FIELDS);
  const dividendBaseMap = weightedFactorScoreBatch(universe, DIVIDEND_FIELDS);

  const bundles = new Map<string, FactorScoreBundle>();

  for (const metrics of universe) {
    const dividendMeta = applyDividendPayoutPenalty(
      dividendBaseMap.get(metrics.ticker) ?? {
        score: 0,
        available: 0,
        total: 0,
        confidence: "low" as DataConfidence,
      },
      metrics
    );

    const meta: Record<FactorId, FactorScoreMeta> = {
      value: valueMap.get(metrics.ticker) ?? emptyMeta(),
      quality: qualityMap.get(metrics.ticker) ?? emptyMeta(),
      growth: growthMap.get(metrics.ticker) ?? emptyMeta(),
      momentum: momentumMap.get(metrics.ticker) ?? emptyMeta(),
      stability: stabilityMap.get(metrics.ticker) ?? emptyMeta(),
      dividend: dividendMeta,
    };

    const confidence = Object.fromEntries(
      (Object.keys(meta) as FactorId[]).map((id) => [id, meta[id].confidence])
    ) as Record<FactorId, DataConfidence>;

    bundles.set(metrics.ticker, {
      scores: {
        value: meta.value.score,
        quality: meta.quality.score,
        growth: meta.growth.score,
        momentum: meta.momentum.score,
        stability: meta.stability.score,
        dividend: meta.dividend.score,
      },
      confidence,
      meta,
    });
  }

  return bundles;
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
    case "dividend":
      return computeDividendScore(metrics, universe);
  }
}

/** 멀티팩터 UI 슬라이더용 (배당 제외) */
export const MULTI_FACTOR_UI_IDS: FactorId[] = [
  "value",
  "quality",
  "growth",
  "momentum",
  "stability",
];

export const ALL_FACTOR_IDS: FactorId[] = [
  ...MULTI_FACTOR_UI_IDS,
  "dividend",
];

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
    description: "ROE, ROIC, 마진, 부채비율 기준 상대 순위",
  },
  growth: {
    name: "성장 (Growth)",
    shortName: "성장",
    description: "매출·EPS·영업이익·FCF 성장률 기준 상대 순위",
  },
  momentum: {
    name: "모멘텀 (Momentum)",
    shortName: "모멘텀",
    description: "1·3·6·12개월 수익률 및 이동평균 기준 상대 순위",
  },
  stability: {
    name: "안정성 (Stability)",
    shortName: "안정성",
    description: "베타, 변동성, MDD, 유동비율 기준 상대 순위",
  },
  dividend: {
    name: "배당 (Dividend)",
    shortName: "배당",
    description: "배당수익률, 성장, 지급비율, 일관성 기준 상대 순위",
  },
};
