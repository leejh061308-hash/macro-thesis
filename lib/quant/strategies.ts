import {
  getScoringUniverse,
  getSelectionNote,
  getStrategyPool,
  isThemeStrategy,
  passesThemeFilter,
} from "./sectors";
import { computeStrategyFactorScore } from "./strategy-factors";
import { buildSelectionReasons } from "./strategy-reasons";
import type {
  QuantMetrics,
  StrategyDefinition,
  StrategyId,
  StrategyResult,
} from "./types";
import { computeCompanyScore } from "@/lib/timing/company-score";

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: "value",
    name: "가치주 전략",
    shortName: "가치주",
    description: "저평가된 기업을 찾는 전략",
    aiSummary: "PER, PBR, EV/EBITDA, FCF Yield 기준으로 업종 제한 없이 저평가 기업을 선별합니다.",
    criteria: ["PER", "PBR", "EV/EBITDA", "FCF Yield"],
    icon: "◆",
    category: "style",
    selectionNote: "업종 제한 없이 재무 데이터와 성과를 평가합니다.",
    interpretGuide: "저평가 구간에서 회복 가능성과 업종별 PER 차이를 설명합니다.",
  },
  {
    id: "growth",
    name: "성장주 전략",
    shortName: "성장주",
    description: "매출과 이익이 빠르게 성장하는 기업을 찾는 전략",
    aiSummary: "매출·EPS·영업이익 성장률 기준으로 업종 제한 없이 고성장 기업을 선별합니다.",
    criteria: ["매출 성장률", "EPS 성장률", "영업이익률"],
    icon: "▲",
    category: "style",
    selectionNote: "업종 제한 없이 재무 데이터와 성과를 평가합니다.",
    interpretGuide: "성장률 대비 변동성과 시장 국면에서의 강점을 설명합니다.",
  },
  {
    id: "dividend",
    name: "배당주 전략",
    shortName: "배당주",
    description: "꾸준한 배당을 지급하는 기업을 찾는 전략",
    aiSummary: "배당수익률, 배당 성장률, 배당 안정성 기준으로 우량 배당주를 선별합니다.",
    criteria: ["배당수익률", "배당 성장률", "배당 안정성"],
    icon: "●",
    category: "style",
    selectionNote: "업종 제한 없이 재무 데이터와 성과를 평가합니다.",
    interpretGuide: "배당 수익과 원금 변동성의 균형, 금리 환경 영향을 설명합니다.",
  },
  {
    id: "quality-factor",
    name: "퀄리티 전략",
    shortName: "퀄리티",
    description: "수익성과 재무 건전성이 우수한 기업을 선별하는 전략",
    aiSummary: "ROE, ROIC, 영업·순이익률, 부채비율 기준으로 우량 기업을 선별합니다.",
    criteria: ["ROE", "ROIC", "영업이익률", "순이익률", "부채비율"],
    icon: "◈",
    category: "style",
    selectionNote: "업종 제한 없이 재무 데이터와 성과를 평가합니다.",
    interpretGuide: "높은 수익성과 안정적인 재무구조를 보유한 기업을 선별합니다.",
  },
  {
    id: "momentum",
    name: "모멘텀 전략",
    shortName: "모멘텀",
    description: "최근 주가 상승 추세가 강한 종목을 선별하는 전략",
    aiSummary: "3·6·12개월 수익률과 Relative Strength 기준으로 강세 종목을 선별합니다.",
    criteria: ["3개월 수익률", "6개월 수익률", "12개월 수익률", "Relative Strength"],
    icon: "↗",
    category: "style",
    selectionNote: "업종 제한 없이 재무 데이터와 성과를 평가합니다.",
    interpretGuide: "시장의 강한 매수세가 유입되고 있는 종목을 선별합니다.",
  },
  {
    id: "garp",
    name: "GARP 전략",
    shortName: "GARP",
    description: "성장성과 밸류에이션을 동시에 고려하는 전략",
    aiSummary: "PEG, EPS·매출 성장률, PER을 함께 고려해 성장 대비 적정 가격 종목을 선별합니다.",
    criteria: ["PEG Ratio", "EPS 성장률", "매출 성장률", "PER"],
    icon: "◎",
    category: "style",
    selectionNote: "업종 제한 없이 재무 데이터와 성과를 평가합니다.",
    interpretGuide: "높은 성장성과 적정 주가 수준을 동시에 추구합니다.",
  },
  {
    id: "buffett",
    name: "버핏 전략",
    shortName: "버핏",
    description: "장기 복리 성장이 가능한 우량 기업을 선별하는 전략",
    aiSummary: "ROE, 잉여현금흐름, 부채비율, 영업이익률 기준으로 장기 보유형 우량주를 선별합니다.",
    criteria: ["ROE", "잉여현금흐름", "부채비율", "영업이익률"],
    icon: "♛",
    category: "style",
    selectionNote: "업종 제한 없이 재무 데이터와 성과를 평가합니다.",
    interpretGuide: "장기간 보유 가능한 경쟁력 있는 기업을 선별합니다.",
  },
  {
    id: "moat",
    name: "경제적 해자 전략",
    shortName: "해자",
    description: "강력한 경쟁 우위를 보유한 기업을 찾는 전략",
    aiSummary: "ROIC, 이익 안정성, 영업이익률, 현금흐름 기준으로 해자가 넓은 기업을 선별합니다.",
    criteria: ["ROIC", "이익 안정성", "영업이익률", "현금흐름"],
    icon: "⬡",
    category: "style",
    selectionNote: "업종 제한 없이 재무 데이터와 성과를 평가합니다.",
    interpretGuide: "장기간 경쟁 우위를 유지할 가능성이 높은 기업을 선별합니다.",
  },
  {
    id: "ai-beneficiary",
    name: "AI 수혜주 전략",
    shortName: "AI 수혜",
    description: "AI 투자 확대에 따른 수혜 가능성이 높은 기업을 선별",
    aiSummary: "AI 투자 확대에 따라 직접적인 수혜를 받을 가능성이 높은 기업을 선별합니다.",
    criteria: ["매출 성장률", "EPS 성장률", "ROE", "모멘텀"],
    icon: "⚡",
    category: "theme",
    selectionNote: getSelectionNote("ai-beneficiary"),
    interpretGuide: "반도체·AI 인프라·데이터센터·클라우드·전력설비 업종 필터 후 점수를 계산합니다.",
  },
  {
    id: "datacenter",
    name: "데이터센터 수혜 전략",
    shortName: "데이터센터",
    description: "데이터센터 수요 확대의 수혜주를 선별",
    aiSummary: "데이터센터 운영, 냉각, 서버, 네트워크 장비 업종 필터 후 성장·수익성·모멘텀으로 평가합니다.",
    criteria: ["성장률", "수익성", "모멘텀"],
    icon: "▣",
    category: "theme",
    selectionNote: getSelectionNote("datacenter"),
    interpretGuide: "AI·클라우드 확산에 따른 데이터센터 수요 수혜 기업을 선별합니다.",
  },
  {
    id: "power-infra",
    name: "전력 인프라 전략",
    shortName: "전력 인프라",
    description: "전력 수요 확대와 인프라 투자 수혜주를 선별",
    aiSummary: "전력 장비, 변압기, 전력 관리, 전력 반도체 업종 필터 후 성장·수익성·재무 안정성을 평가합니다.",
    criteria: ["성장성", "수익성", "재무 안정성"],
    icon: "⚙",
    category: "theme",
    selectionNote: getSelectionNote("power-infra"),
    interpretGuide: "AI·데이터센터 전력 수요와 그리드 투자 수혜 기업을 선별합니다.",
  },
  {
    id: "rate-hike",
    name: "금리 인상 수혜 전략",
    shortName: "금리↑",
    description: "금리 상승 환경에서 실적 개선 가능성이 높은 기업을 선별",
    aiSummary: "금리 상승 시 수익성이 개선될 가능성이 높은 금융 기업을 선별합니다.",
    criteria: ["ROE", "PBR", "배당수익률", "실적 성장률"],
    icon: "↑",
    category: "theme",
    selectionNote: getSelectionNote("rate-hike"),
    interpretGuide: "은행·보험·자산운용·금융서비스 업종만 평가하며 기술주는 제외합니다.",
  },
  {
    id: "rate-cut",
    name: "금리 인하 수혜 전략",
    shortName: "금리↓",
    description: "금리 하락 환경에서 수혜 가능성이 높은 기업을 선별",
    aiSummary: "금리 인하 시 유동성 확대 수혜가 기대되는 성장주·리츠·기술주를 선별합니다.",
    criteria: ["매출 성장률", "EPS 성장률", "모멘텀"],
    icon: "↓",
    category: "theme",
    selectionNote: getSelectionNote("rate-cut"),
    interpretGuide: "성장주·리츠·기술주 업종 필터 후 성장·모멘텀으로 평가합니다.",
  },
  {
    id: "defensive",
    name: "경기방어주 전략",
    shortName: "경기방어",
    description: "경기 침체 시에도 실적 방어가 가능한 기업을 선별",
    aiSummary: "필수소비재·헬스케어·유틸리티 업종 필터 후 수익성·배당·변동성으로 평가합니다.",
    criteria: ["수익성", "배당 안정성", "변동성"],
    icon: "⛨",
    category: "theme",
    selectionNote: getSelectionNote("defensive"),
    interpretGuide: "경기 침체 국면에서 상대적으로 안정적인 성과가 기대되는 기업을 선별합니다.",
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
  universe: QuantMetrics[],
  ticker: string,
  getter: (m: QuantMetrics) => number | null,
  lowerIsBetter: boolean
): number {
  const values = collect(universe.map(getter));
  const mine = getter(universe.find((m) => m.ticker === ticker)!);
  if (mine == null) return 0;
  return percentileRank(values, mine, lowerIsBetter);
}

export function computeStrategyScore(
  strategyId: StrategyId,
  metrics: QuantMetrics,
  fullUniverse: QuantMetrics[]
): number {
  if (isThemeStrategy(strategyId) && !passesThemeFilter(strategyId, metrics.ticker)) {
    return 0;
  }

  const universe = getScoringUniverse(strategyId, fullUniverse);
  if (universe.length === 0) return 0;

  const ticker = metrics.ticker;

  switch (strategyId) {
    case "value":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.peRatio, true), weight: 30, valid: metrics.peRatio != null && metrics.peRatio > 0 },
        { score: scoreField(universe, ticker, (m) => m.pbRatio, true), weight: 25, valid: metrics.pbRatio != null && metrics.pbRatio > 0 },
        { score: scoreField(universe, ticker, (m) => m.evToEbitda, true), weight: 25, valid: metrics.evToEbitda != null && metrics.evToEbitda > 0 },
        { score: scoreField(universe, ticker, (m) => m.freeCashFlowYield, false), weight: 20, valid: metrics.freeCashFlowYield != null },
      ]);
    case "growth":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.revenueGrowth, false), weight: 40, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.epsGrowth, false), weight: 35, valid: metrics.epsGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.operatingMargin, false), weight: 25, valid: metrics.operatingMargin != null },
      ]);
    case "dividend":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.dividendYield, false), weight: 40, valid: metrics.dividendYield != null && metrics.dividendYield > 0 },
        { score: scoreField(universe, ticker, (m) => m.dividendGrowth, false), weight: 35, valid: metrics.dividendGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.payoutRatio, true), weight: 25, valid: metrics.payoutRatio != null && metrics.payoutRatio > 0 && metrics.payoutRatio < 1 },
      ]);
    case "quality-factor":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.roe, false), weight: 25, valid: metrics.roe != null },
        { score: scoreField(universe, ticker, (m) => m.roic, false), weight: 25, valid: metrics.roic != null },
        { score: scoreField(universe, ticker, (m) => m.operatingMargin, false), weight: 20, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, ticker, (m) => m.netMargin, false), weight: 15, valid: metrics.netMargin != null },
        { score: scoreField(universe, ticker, (m) => m.debtToEquity, true), weight: 15, valid: metrics.debtToEquity != null && metrics.debtToEquity >= 0 },
      ]);
    case "momentum":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.return3m, false), weight: 25, valid: metrics.return3m != null },
        { score: scoreField(universe, ticker, (m) => m.return6m, false), weight: 25, valid: metrics.return6m != null },
        { score: scoreField(universe, ticker, (m) => m.return12m, false), weight: 30, valid: metrics.return12m != null },
        { score: scoreField(universe, ticker, (m) => m.relativeStrength, false), weight: 20, valid: metrics.relativeStrength != null },
      ]);
    case "garp":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.pegRatio, true), weight: 30, valid: metrics.pegRatio != null && metrics.pegRatio > 0 && metrics.pegRatio < 5 },
        { score: scoreField(universe, ticker, (m) => m.epsGrowth, false), weight: 25, valid: metrics.epsGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.revenueGrowth, false), weight: 25, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.peRatio, true), weight: 20, valid: metrics.peRatio != null && metrics.peRatio > 0 && metrics.peRatio < 60 },
      ]);
    case "buffett":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.roe, false), weight: 30, valid: metrics.roe != null },
        { score: scoreField(universe, ticker, (m) => m.freeCashFlowYield, false), weight: 30, valid: metrics.freeCashFlowYield != null },
        { score: scoreField(universe, ticker, (m) => m.debtToEquity, true), weight: 20, valid: metrics.debtToEquity != null && metrics.debtToEquity >= 0 },
        { score: scoreField(universe, ticker, (m) => m.operatingMargin, false), weight: 20, valid: metrics.operatingMargin != null },
      ]);
    case "moat":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.roic, false), weight: 30, valid: metrics.roic != null },
        { score: scoreField(universe, ticker, (m) => m.earningsStability, false), weight: 25, valid: metrics.earningsStability != null },
        { score: scoreField(universe, ticker, (m) => m.operatingMargin, false), weight: 25, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, ticker, (m) => m.cashFlowStability, false), weight: 20, valid: metrics.cashFlowStability != null },
      ]);
    case "ai-beneficiary":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.revenueGrowth, false), weight: 30, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.epsGrowth, false), weight: 25, valid: metrics.epsGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.roe, false), weight: 25, valid: metrics.roe != null },
        { score: scoreField(universe, ticker, (m) => m.return12m, false), weight: 20, valid: metrics.return12m != null },
      ]);
    case "datacenter":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.revenueGrowth, false), weight: 40, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.operatingMargin, false), weight: 35, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, ticker, (m) => m.return6m, false), weight: 25, valid: metrics.return6m != null },
      ]);
    case "power-infra":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.revenueGrowth, false), weight: 35, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.roe, false), weight: 35, valid: metrics.roe != null },
        { score: scoreField(universe, ticker, (m) => m.debtToEquity, true), weight: 30, valid: metrics.debtToEquity != null && metrics.debtToEquity >= 0 },
      ]);
    case "rate-hike":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.roe, false), weight: 30, valid: metrics.roe != null },
        { score: scoreField(universe, ticker, (m) => m.pbRatio, true), weight: 25, valid: metrics.pbRatio != null && metrics.pbRatio > 0 },
        { score: scoreField(universe, ticker, (m) => m.dividendYield, false), weight: 25, valid: metrics.dividendYield != null },
        { score: scoreField(universe, ticker, (m) => m.epsGrowth, false), weight: 20, valid: metrics.epsGrowth != null },
      ]);
    case "rate-cut":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.revenueGrowth, false), weight: 35, valid: metrics.revenueGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.epsGrowth, false), weight: 35, valid: metrics.epsGrowth != null },
        { score: scoreField(universe, ticker, (m) => m.return6m, false), weight: 30, valid: metrics.return6m != null },
      ]);
    case "defensive":
      return weightedScore([
        { score: scoreField(universe, ticker, (m) => m.operatingMargin, false), weight: 35, valid: metrics.operatingMargin != null },
        { score: scoreField(universe, ticker, (m) => m.dividendYield, false), weight: 35, valid: metrics.dividendYield != null && metrics.dividendYield > 0 },
        { score: scoreField(universe, ticker, (m) => m.volatility, true), weight: 30, valid: metrics.volatility != null },
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
    .map((m) => {
      const legacy = computeStrategyScore(strategyId, m, fullUniverse);
      const factor = computeStrategyFactorScore(strategyId, m, fullUniverse);
      const strategyScore = legacy > 0 ? legacy : factor;
      return {
        ticker: m.ticker,
        name: m.name,
        score: strategyScore,
        strategyScore,
        companyScore: computeCompanyScore(m, fullUniverse),
        timingScore: null as number | null,
        tags: computeStyleTags(m, fullUniverse),
        reasons: buildSelectionReasons(strategyId, m, pool, strategyScore),
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return scored;
}

export { getSelectionNote };
