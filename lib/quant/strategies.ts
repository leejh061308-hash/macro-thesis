import { getStrategyPool, getSelectionNote } from "./sectors";
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
    category: "core",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide: "저평가 구간에서 회복 가능성과 업종별 PER 차이를 설명합니다.",
  },
  {
    id: "growth",
    name: "성장주 전략",
    shortName: "성장주",
    description: "매출과 이익이 빠르게 성장하는 기업을 찾는 전략",
    criteria: ["매출 성장률", "EPS 성장률", "영업이익률"],
    icon: "▲",
    category: "core",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide: "성장률 대비 변동성과 시장 국면(금리·경기)에서의 강점을 설명합니다.",
  },
  {
    id: "dividend",
    name: "배당주 전략",
    shortName: "배당주",
    description: "꾸준한 배당을 지급하는 기업을 찾는 전략",
    criteria: ["배당수익률", "배당 성장률", "배당 안정성"],
    icon: "●",
    category: "core",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide: "배당 수익과 원금 변동성의 균형, 금리 환경 영향을 설명합니다.",
  },
  {
    id: "quality",
    name: "우량주 전략",
    shortName: "우량주",
    description: "수익성과 재무 안정성이 우수한 기업을 찾는 전략",
    criteria: ["ROE", "영업이익률", "부채비율"],
    icon: "★",
    category: "core",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide: "재무 건전성이 하락장에서 주는 방어력을 설명합니다.",
  },
  {
    id: "low-volatility",
    name: "저변동성 전략",
    shortName: "저변동성",
    description: "주가 변동성이 낮은 기업을 찾는 전략",
    criteria: ["베타", "변동성", "최대 낙폭"],
    icon: "◇",
    category: "core",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide: "변동성 감소 효과와 상승장에서의 상대적 열세 가능성을 설명합니다.",
  },
  {
    id: "quality-factor",
    name: "퀄리티 전략",
    shortName: "퀄리티",
    description: "수익성과 재무 건전성이 우수한 기업을 선별하는 전략",
    criteria: ["ROE", "ROIC", "영업이익률", "순이익률", "부채비율", "잉여현금흐름"],
    icon: "◈",
    category: "factor",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide:
      "높은 수익성과 안정적인 재무구조를 보유한 기업을 선별합니다. 왜 퀄리티 팩터가 장기적으로 유효한지 설명합니다.",
  },
  {
    id: "momentum",
    name: "모멘텀 전략",
    shortName: "모멘텀",
    description: "최근 주가 상승 추세가 강한 종목을 선별하는 전략",
    criteria: ["3개월 수익률", "6개월 수익률", "12개월 수익률", "상대강도(RS)"],
    icon: "↗",
    category: "factor",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide:
      "시장의 강한 매수세가 유입되고 있는 종목을 선별합니다. 추세 반전 리스크도 함께 설명합니다.",
  },
  {
    id: "garp",
    name: "GARP 전략",
    shortName: "GARP",
    description: "성장성과 밸류에이션을 동시에 고려하는 전략",
    criteria: ["PEG Ratio", "매출 성장률", "EPS 성장률", "PER"],
    icon: "◎",
    category: "factor",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide:
      "높은 성장성과 적정 주가 수준을 동시에 추구합니다. 과도한 고평가 구간의 위험도 설명합니다.",
  },
  {
    id: "buffett",
    name: "버핏 전략",
    shortName: "버핏",
    description: "장기 복리 성장이 가능한 우량 기업을 선별하는 전략",
    criteria: ["ROE", "부채비율", "잉여현금흐름", "이익 성장률", "영업이익률"],
    icon: "♛",
    category: "factor",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide:
      "장기간 보유 가능한 경쟁력 있는 기업을 선별합니다. 복리 효과와 인내가 필요한 이유를 설명합니다.",
  },
  {
    id: "moat",
    name: "경제적 해자 전략",
    shortName: "해자",
    description: "강력한 경쟁 우위를 보유한 기업을 찾는 전략",
    criteria: ["ROIC", "영업이익률", "이익 안정성", "시장지배력", "현금흐름 안정성"],
    icon: "⬡",
    category: "factor",
    selectionNote: "S&P500 대형주 유니버스 전체에 동일 기준을 적용합니다.",
    interpretGuide:
      "장기간 경쟁 우위를 유지할 가능성이 높은 기업을 선별합니다. 해자가 약화될 수 있는 상황도 설명합니다.",
  },
  {
    id: "defensive",
    name: "경기방어주 전략",
    shortName: "경기방어",
    description: "경기 침체 시에도 실적 방어가 가능한 기업을 선별하는 전략",
    criteria: ["실적 안정성", "배당 안정성", "변동성"],
    icon: "⛨",
    category: "macro",
    selectionNote: "필수소비재, 헬스케어, 유틸리티 섹터 종목만 평가합니다.",
    interpretGuide:
      "경기 침체 국면에서도 상대적으로 안정적인 성과가 기대됩니다. 강한 상승장에서의 상대적 열세도 설명합니다.",
  },
  {
    id: "ai-beneficiary",
    name: "AI 수혜주 전략",
    shortName: "AI 수혜",
    description: "AI 산업 성장의 수혜 가능성이 높은 기업을 선별",
    criteria: ["매출·이익 성장", "영업이익률", "모멘텀"],
    icon: "⚡",
    category: "macro",
    selectionNote: "반도체, 클라우드, AI 인프라 관련 종목만 평가합니다.",
    interpretGuide:
      "AI 투자 확대에 따른 수혜 가능성이 높은 기업을 선별합니다. 밸류에이션 과열 리스크도 설명합니다.",
  },
  {
    id: "rate-hike",
    name: "금리 인상 수혜 전략",
    shortName: "금리↑",
    description: "금리 상승 환경에서 실적 개선 가능성이 높은 기업을 선별",
    criteria: ["ROE", "수익성", "배당"],
    icon: "↑",
    category: "macro",
    selectionNote: "은행, 보험, 금융 섹터 종목만 평가합니다.",
    interpretGuide:
      "금리 상승 시 수익성 개선이 기대되는 기업을 선별합니다. 경기 둔화 시 대출 부실 리스크도 설명합니다.",
  },
  {
    id: "rate-cut",
    name: "금리 인하 수혜 전략",
    shortName: "금리↓",
    description: "금리 하락 환경에서 수혜 가능성이 높은 기업을 선별",
    criteria: ["성장성", "베타", "EPS 성장"],
    icon: "↓",
    category: "macro",
    selectionNote: "성장주, 기술주, REITs 종목만 평가합니다.",
    interpretGuide:
      "유동성 확대의 수혜를 받을 가능성이 높은 기업을 선별합니다. 금리 재상승 시 민감도도 설명합니다.",
  },
];

export function getStrategy(id: StrategyId): StrategyDefinition {
  const strategy = STRATEGIES.find((s) => s.id === id);
  if (!strategy) throw new Error(`Unknown strategy: ${id}`);
  return strategy;
}

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

function marketCapScore(all: QuantMetrics[], ticker: string): number {
  return scoreField(all, ticker, (m) => m.marketCap, false);
}

export function computeStrategyScore(
  strategyId: StrategyId,
  metrics: QuantMetrics,
  universe: QuantMetrics[]
): number {
  switch (strategyId) {
    case "value":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.peRatio, true), weight: 35, valid: metrics.peRatio != null && metrics.peRatio > 0 },
        { score: scoreField(universe, metrics.ticker, (m) => m.pbRatio, true), weight: 35, valid: metrics.pbRatio != null && metrics.pbRatio > 0 },
        { score: scoreField(universe, metrics.ticker, (m) => m.evToEbitda, true), weight: 30, valid: metrics.evToEbitda != null && metrics.evToEbitda > 0 },
      ]);
    case "growth":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.revenueGrowth, false), weight: 40, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.epsGrowth, false), weight: 35, valid: metrics.epsGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.operatingMargin, false), weight: 25, valid: metrics.operatingMargin != null },
      ]);
    case "dividend":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.dividendYield, false), weight: 40, valid: metrics.dividendYield != null && metrics.dividendYield > 0 },
        { score: scoreField(universe, metrics.ticker, (m) => m.dividendGrowth, false), weight: 35, valid: metrics.dividendGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.payoutRatio, true), weight: 25, valid: metrics.payoutRatio != null && metrics.payoutRatio > 0 && metrics.payoutRatio < 1 },
      ]);
    case "quality":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.roe, false), weight: 40, valid: metrics.roe != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.operatingMargin, false), weight: 35, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.debtToEquity, true), weight: 25, valid: metrics.debtToEquity != null && metrics.debtToEquity >= 0 },
      ]);
    case "low-volatility":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.beta, true), weight: 35, valid: metrics.beta != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.volatility, true), weight: 35, valid: metrics.volatility != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.maxDrawdown, true), weight: 30, valid: metrics.maxDrawdown != null },
      ]);
    case "quality-factor":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.roe, false), weight: 20, valid: metrics.roe != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.roic, false), weight: 20, valid: metrics.roic != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.operatingMargin, false), weight: 15, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.netMargin, false), weight: 15, valid: metrics.netMargin != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.debtToEquity, true), weight: 15, valid: metrics.debtToEquity != null && metrics.debtToEquity >= 0 },
        { score: scoreField(universe, metrics.ticker, (m) => m.freeCashFlowYield, false), weight: 15, valid: metrics.freeCashFlowYield != null && metrics.freeCashFlowYield > 0 },
      ]);
    case "momentum":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.return3m, false), weight: 25, valid: metrics.return3m != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.return6m, false), weight: 25, valid: metrics.return6m != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.return12m, false), weight: 30, valid: metrics.return12m != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.relativeStrength, false), weight: 20, valid: metrics.relativeStrength != null },
      ]);
    case "garp":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.pegRatio, true), weight: 30, valid: metrics.pegRatio != null && metrics.pegRatio > 0 && metrics.pegRatio < 5 },
        { score: scoreField(universe, metrics.ticker, (m) => m.revenueGrowth, false), weight: 25, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.epsGrowth, false), weight: 25, valid: metrics.epsGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.peRatio, true), weight: 20, valid: metrics.peRatio != null && metrics.peRatio > 0 && metrics.peRatio < 60 },
      ]);
    case "buffett":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.roe, false), weight: 25, valid: metrics.roe != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.debtToEquity, true), weight: 20, valid: metrics.debtToEquity != null && metrics.debtToEquity >= 0 },
        { score: scoreField(universe, metrics.ticker, (m) => m.freeCashFlowYield, false), weight: 25, valid: metrics.freeCashFlowYield != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.epsGrowth, false), weight: 15, valid: metrics.epsGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.operatingMargin, false), weight: 15, valid: metrics.operatingMargin != null },
      ]);
    case "moat":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.roic, false), weight: 25, valid: metrics.roic != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.operatingMargin, false), weight: 20, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.earningsStability, false), weight: 20, valid: metrics.earningsStability != null },
        { score: marketCapScore(universe, metrics.ticker), weight: 15, valid: metrics.marketCap != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.cashFlowStability, false), weight: 20, valid: metrics.cashFlowStability != null },
      ]);
    case "defensive":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.earningsStability, false), weight: 35, valid: metrics.earningsStability != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.dividendYield, false), weight: 35, valid: metrics.dividendYield != null && metrics.dividendYield > 0 },
        { score: scoreField(universe, metrics.ticker, (m) => m.volatility, true), weight: 30, valid: metrics.volatility != null },
      ]);
    case "ai-beneficiary":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.revenueGrowth, false), weight: 30, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.epsGrowth, false), weight: 25, valid: metrics.epsGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.operatingMargin, false), weight: 25, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.return12m, false), weight: 20, valid: metrics.return12m != null },
      ]);
    case "rate-hike":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.roe, false), weight: 40, valid: metrics.roe != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.operatingMargin, false), weight: 30, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.dividendYield, false), weight: 30, valid: metrics.dividendYield != null },
      ]);
    case "rate-cut":
      return weightedScore([
        { score: scoreField(universe, metrics.ticker, (m) => m.revenueGrowth, false), weight: 35, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.beta, false), weight: 30, valid: metrics.beta != null },
        { score: scoreField(universe, metrics.ticker, (m) => m.epsGrowth, false), weight: 35, valid: metrics.epsGrowth != null },
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
  const scores = [
    { tag: "성장주", score: computeStrategyScore("growth", metrics, universe) },
    { tag: "가치주", score: computeStrategyScore("value", metrics, universe) },
    { tag: "우량주", score: computeStrategyScore("quality", metrics, universe) },
    { tag: "퀄리티", score: computeStrategyScore("quality-factor", metrics, universe) },
    { tag: "모멘텀", score: computeStrategyScore("momentum", metrics, universe) },
    { tag: "배당주", score: computeStrategyScore("dividend", metrics, universe) },
  ]
    .filter((r) => r.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  for (const r of scores) tags.push(r.tag);

  if (computeStrategyScore("ai-beneficiary", metrics, universe) >= 70) {
    tags.push("AI 수혜주");
  }

  if (tags.length === 0) tags.push("대형주");
  return tags.slice(0, 3);
}

export function rankByStrategy(
  strategyId: StrategyId,
  fullUniverse: QuantMetrics[],
  limit = 50
): StrategyResult[] {
  const pool = getStrategyPool(strategyId, fullUniverse);
  if (pool.length === 0) return [];

  const scored = pool
    .map((m) => ({
      ticker: m.ticker,
      name: m.name,
      score: computeStrategyScore(strategyId, m, pool),
      tags: computeStyleTags(m, fullUniverse),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return scored;
}

export { getSelectionNote };
