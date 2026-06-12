import type {
  QuantMetrics,
  StrategyDefinition,
  StrategyId,
  StrategyResult,
} from "./types";

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: "value",
    name: "가치주 전략",
    shortName: "가치주",
    description: "저평가된 기업을 찾는 전략",
    criteria: ["PER", "PBR", "EV/EBITDA"],
    icon: "◆",
  },
  {
    id: "growth",
    name: "성장주 전략",
    shortName: "성장주",
    description: "매출과 이익이 빠르게 성장하는 기업을 찾는 전략",
    criteria: ["매출 성장률", "EPS 성장률", "영업이익률"],
    icon: "▲",
  },
  {
    id: "dividend",
    name: "배당주 전략",
    shortName: "배당주",
    description: "꾸준한 배당을 지급하는 기업을 찾는 전략",
    criteria: ["배당수익률", "배당 성장률", "배당 안정성"],
    icon: "●",
  },
  {
    id: "quality",
    name: "우량주 전략",
    shortName: "우량주",
    description: "수익성과 재무 안정성이 우수한 기업을 찾는 전략",
    criteria: ["ROE", "영업이익률", "부채비율"],
    icon: "★",
  },
  {
    id: "low-volatility",
    name: "저변동성 전략",
    shortName: "저변동성",
    description: "주가 변동성이 낮은 기업을 찾는 전략",
    criteria: ["베타", "변동성", "최대 낙폭"],
    icon: "◇",
  },
];

export function getStrategy(id: StrategyId): StrategyDefinition {
  const strategy = STRATEGIES.find((s) => s.id === id);
  if (!strategy) throw new Error(`Unknown strategy: ${id}`);
  return strategy;
}

const AI_BENEFICIARIES = new Set([
  "NVDA",
  "MSFT",
  "GOOGL",
  "META",
  "AMD",
  "AVGO",
  "ORCL",
  "CRM",
  "NOW",
  "PANW",
]);

function percentileRank(
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

function collect(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v != null && Number.isFinite(v));
}

function weightedScore(
  parts: Array<{ score: number; weight: number; valid: boolean }>
): number {
  const valid = parts.filter((p) => p.valid);
  if (valid.length === 0) return 0;
  const totalWeight = valid.reduce((s, p) => s + p.weight, 0);
  const sum = valid.reduce((s, p) => s + p.score * p.weight, 0);
  return Math.round(sum / totalWeight);
}

function scoreField(
  all: QuantMetrics[],
  ticker: string,
  getter: (m: QuantMetrics) => number | null,
  lowerIsBetter: boolean
): number {
  const values = collect(all.map(getter));
  const mine = getter(all.find((m) => m.ticker === ticker)!);
  if (mine == null) return 0;
  return percentileRank(values, mine, lowerIsBetter);
}

export function computeStrategyScore(
  strategyId: StrategyId,
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  switch (strategyId) {
    case "value":
      return weightedScore([
        {
          score: scoreField(universe, metrics.ticker, (m) => m.peRatio, true),
          weight: 35,
          valid: metrics.peRatio != null && metrics.peRatio > 0,
        },
        {
          score: scoreField(universe, metrics.ticker, (m) => m.pbRatio, true),
          weight: 35,
          valid: metrics.pbRatio != null && metrics.pbRatio > 0,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.evToEbitda,
            true
          ),
          weight: 30,
          valid: metrics.evToEbitda != null && metrics.evToEbitda > 0,
        },
      ]);
    case "growth":
      return weightedScore([
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.revenueGrowth,
            false
          ),
          weight: 40,
          valid: metrics.revenueGrowth != null,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.epsGrowth,
            false
          ),
          weight: 35,
          valid: metrics.epsGrowth != null,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.operatingMargin,
            false
          ),
          weight: 25,
          valid: metrics.operatingMargin != null,
        },
      ]);
    case "dividend":
      return weightedScore([
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.dividendYield,
            false
          ),
          weight: 40,
          valid: metrics.dividendYield != null && metrics.dividendYield > 0,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.dividendGrowth,
            false
          ),
          weight: 35,
          valid: metrics.dividendGrowth != null,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.payoutRatio,
            true
          ),
          weight: 25,
          valid:
            metrics.payoutRatio != null &&
            metrics.payoutRatio > 0 &&
            metrics.payoutRatio < 1,
        },
      ]);
    case "quality":
      return weightedScore([
        {
          score: scoreField(universe, metrics.ticker, (m) => m.roe, false),
          weight: 40,
          valid: metrics.roe != null,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.operatingMargin,
            false
          ),
          weight: 35,
          valid: metrics.operatingMargin != null,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.debtToEquity,
            true
          ),
          weight: 25,
          valid: metrics.debtToEquity != null && metrics.debtToEquity >= 0,
        },
      ]);
    case "low-volatility":
      return weightedScore([
        {
          score: scoreField(universe, metrics.ticker, (m) => m.beta, true),
          weight: 35,
          valid: metrics.beta != null,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.volatility,
            true
          ),
          weight: 35,
          valid: metrics.volatility != null,
        },
        {
          score: scoreField(
            universe,
            metrics.ticker,
            (m) => m.maxDrawdown,
            true
          ),
          weight: 30,
          valid: metrics.maxDrawdown != null,
        },
      ]);
    default:
      return 0;
  }
}

export function computeStyleTags(
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): string[] {
  const tags: string[] = [];

  const growthScore = computeStrategyScore("growth", metrics, universe);
  const valueScore = computeStrategyScore("value", metrics, universe);
  const qualityScore = computeStrategyScore("quality", metrics, universe);
  const dividendScore = computeStrategyScore("dividend", metrics, universe);
  const lowVolScore = computeStrategyScore("low-volatility", metrics, universe);

  const ranked = [
    { tag: "성장주", score: growthScore },
    { tag: "가치주", score: valueScore },
    { tag: "우량주", score: qualityScore },
    { tag: "배당주", score: dividendScore },
    { tag: "저변동성", score: lowVolScore },
  ]
    .filter((r) => r.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  for (const r of ranked) tags.push(r.tag);

  if (AI_BENEFICIARIES.has(metrics.ticker)) {
    tags.push("AI 수혜주");
  }

  if (tags.length === 0) tags.push("대형주");

  return tags.slice(0, 3);
}

export function rankByStrategy(
  strategyId: StrategyId,
  universe: QuantMetrics[],
  limit = 50
) {
  const scored = universe
    .map((m) => ({
      ticker: m.ticker,
      name: m.name,
      score: computeStrategyScore(strategyId, m, universe),
      tags: computeStyleTags(m, universe),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return scored;
}
