import { ALL_FACTOR_IDS, computeAllFactorScores, FACTOR_LABELS } from "./factors";
import { computeAllStrategyOverviews, type StrategyOverviewItem } from "./strategy-overview";
import type {
  FactorId,
  FactorScores,
  QuantMetrics,
} from "./types";

export interface FactorHeatmapItem {
  factor: FactorId;
  label: string;
  score: number;
  intensity: number;
}

export interface FactorRotationItem {
  factor: FactorId;
  label: string;
  current: number;
  recent: number;
  change: number;
  direction: "up" | "down" | "flat";
}

export type RotationWindow = "1m" | "3m" | "6m" | "1y";

export interface PortfolioPreset {
  id: "aggressive" | "balanced" | "defensive" | "dividend";
  name: string;
  description: string;
  weights: Record<FactorId, number>;
  aiSummary: string;
}

export interface MarketAnalyticsResult {
  heatmap: FactorHeatmapItem[];
  heatmapAiSummary: string;
  rotation: FactorRotationItem[];
  rotationWindow: RotationWindow;
  rotationAiSummary: string;
  strategies: StrategyOverviewItem[];
  strategiesAiSummary: string;
  updatedAt: string;
}

export const PORTFOLIO_PRESETS: PortfolioPreset[] = [
  {
    id: "aggressive",
    name: "공격형",
    description: "성장·모멘텀 중심 — 상승 국면에 유리",
    weights: { value: 10, quality: 20, growth: 30, momentum: 30, stability: 10 },
    aiSummary: "고성장·강한 추세 종목 비중을 높여 상승장 알파를 추구합니다.",
  },
  {
    id: "balanced",
    name: "균형형",
    description: "5대 팩터 균등 — 올웨더 접근",
    weights: { value: 20, quality: 20, growth: 20, momentum: 20, stability: 20 },
    aiSummary: "팩터 간 분산으로 특정 스타일 쏠림을 줄인 균형 포트폴리오입니다.",
  },
  {
    id: "defensive",
    name: "안정형",
    description: "퀄리티·안정성 중심 — 변동성 완화",
    weights: { value: 15, quality: 35, growth: 10, momentum: 10, stability: 30 },
    aiSummary: "재무 우량·저변동 종목 위주로 방어적 배분합니다.",
  },
  {
    id: "dividend",
    name: "배당형",
    description: "가치·안정·퀄리티 — 배당 매력 종목",
    weights: { value: 35, quality: 30, growth: 10, momentum: 5, stability: 20 },
    aiSummary: "저평가·우량·저변동 특성을 결합해 배당·현금흐름 매력을 노립니다.",
  },
];

function averageFactors(scores: FactorScores[]): FactorScores {
  const result: FactorScores = {
    value: 0,
    quality: 0,
    growth: 0,
    momentum: 0,
    stability: 0,
  };
  if (scores.length === 0) return result;

  for (const id of ALL_FACTOR_IDS) {
    const sum = scores.reduce((s, f) => s + f[id], 0);
    result[id] = Math.round(sum / scores.length);
  }
  return result;
}

function returnForWindow(m: QuantMetrics, window: RotationWindow): number | null {
  switch (window) {
    case "1m":
      return m.return3m != null ? m.return3m / 3 : null;
    case "3m":
      return m.return3m;
    case "6m":
      return m.return6m;
    case "1y":
      return m.return12m;
  }
}

export function buildFactorHeatmap(universe: QuantMetrics[]): FactorHeatmapItem[] {
  const allScores = universe
    .map((m) => computeAllFactorScores(m, universe))
    .filter((f) => ALL_FACTOR_IDS.some((id) => f[id] > 0));

  const avg = averageFactors(allScores);

  return ALL_FACTOR_IDS.map((factor) => ({
    factor,
    label: FACTOR_LABELS[factor].shortName,
    score: avg[factor],
    intensity: avg[factor] / 100,
  }));
}

export function buildHeatmapAiSummary(heatmap: FactorHeatmapItem[]): string {
  const sorted = [...heatmap].sort((a, b) => b.score - a.score);
  const strong = sorted.filter((h) => h.score >= 65).map((h) => h.label);
  const weak = sorted.filter((h) => h.score < 55).map((h) => h.label);

  if (strong.length === 0) {
    return "현재 유니버스 전반에서 두드러진 팩터 우위가 없습니다. 개별 종목 편차가 큰 구간입니다.";
  }
  let msg = `현재 시장은 ${strong.slice(0, 2).join("·")} 팩터 중심으로 움직이고 있습니다.`;
  if (weak.length > 0) {
    msg += ` ${weak[0]} 팩터는 상대적으로 약합니다.`;
  }
  return msg;
}

export function buildFactorRotation(
  universe: QuantMetrics[],
  window: RotationWindow = "3m"
): FactorRotationItem[] {
  const withData = universe
    .map((m) => ({
      m,
      factors: computeAllFactorScores(m, universe),
      ret: returnForWindow(m, window),
    }))
    .filter((x) => x.ret != null);

  if (withData.length < 10) {
    const avg = averageFactors(universe.map((m) => computeAllFactorScores(m, universe)));
    return ALL_FACTOR_IDS.map((factor) => ({
      factor,
      label: FACTOR_LABELS[factor].shortName,
      current: avg[factor],
      recent: avg[factor],
      change: 0,
      direction: "flat" as const,
    }));
  }

  const sorted = [...withData].sort((a, b) => (b.ret ?? 0) - (a.ret ?? 0));
  const leaderCount = Math.max(5, Math.floor(sorted.length * 0.33));
  const leaders = sorted.slice(0, leaderCount);
  const laggards = sorted.slice(-leaderCount);

  const marketAvg = averageFactors(withData.map((x) => x.factors));
  const leaderAvg = averageFactors(leaders.map((x) => x.factors));
  const laggardAvg = averageFactors(laggards.map((x) => x.factors));

  return ALL_FACTOR_IDS.map((factor) => {
    const current = marketAvg[factor];
    const recent = leaderAvg[factor];
    const change = recent - laggardAvg[factor];
    return {
      factor,
      label: FACTOR_LABELS[factor].shortName,
      current,
      recent,
      change,
      direction: change > 4 ? "up" : change < -4 ? "down" : "flat",
    };
  });
}

export function buildRotationAiSummary(
  rotation: FactorRotationItem[],
  window: RotationWindow
): string {
  const windowLabel: Record<RotationWindow, string> = {
    "1m": "최근 1개월",
    "3m": "최근 3개월",
    "6m": "최근 6개월",
    "1y": "최근 1년",
  };

  const rising = rotation.filter((r) => r.direction === "up").map((r) => r.label);
  const falling = rotation.filter((r) => r.direction === "down").map((r) => r.label);

  if (rising.length === 0 && falling.length === 0) {
    return `${windowLabel[window]} 구간에서 뚜렷한 팩터 로테이션 신호는 없습니다.`;
  }

  let msg = `${windowLabel[window]} 수익률 상위 종목 기준, `;
  if (rising.length > 0) msg += `${rising.join("·")} 팩터로 자금이 쏠리는 모습입니다.`;
  if (falling.length > 0) msg += ` ${falling.join("·")} 팩터는 상대적으로 약화되고 있습니다.`;
  return msg.trim();
}

export function buildStrategiesAiSummary(
  strategies: StrategyOverviewItem[]
): string {
  const top = [...strategies]
    .filter((s) => s.suitabilityScore > 0)
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
    .slice(0, 3);

  if (top.length === 0) {
    return "현재 유니버스에서 두드러진 전략 강세 신호가 없습니다.";
  }

  return `현재 ${top.map((s) => `${s.shortName}(${s.suitabilityScore}점·${s.statusLabel})`).join(", ")} 전략이 상대적으로 유리합니다.`;
}

export function buildMarketAnalytics(
  universe: QuantMetrics[],
  rotationWindow: RotationWindow = "3m"
): MarketAnalyticsResult {
  const heatmap = buildFactorHeatmap(universe);
  const rotation = buildFactorRotation(universe, rotationWindow);
  const strategies = computeAllStrategyOverviews(universe);

  return {
    heatmap,
    heatmapAiSummary: buildHeatmapAiSummary(heatmap),
    rotation,
    rotationWindow,
    rotationAiSummary: buildRotationAiSummary(rotation, rotationWindow),
    strategies,
    strategiesAiSummary: buildStrategiesAiSummary(strategies),
    updatedAt: new Date().toISOString(),
  };
}
