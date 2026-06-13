import type { FactorId, RankingEntry, StrategyResult } from "./types";

export type QuantViewMode = "basic" | "advanced";

const STYLE_LABELS: Record<FactorId, string> = {
  value: "가치주",
  quality: "우량주",
  growth: "성장주",
  momentum: "모멘텀",
  stability: "안정주",
};

export interface BasicStockView {
  aiScore: number;
  attractiveness: number;
  riskLabel: "낮음" | "보통" | "높음";
  styleTags: string[];
  oneLiner: string;
}

export function deriveBasicStockView(entry: RankingEntry): BasicStockView {
  const sorted = (Object.entries(entry.factors) as [FactorId, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  const styleTags = sorted
    .filter(([, score]) => score >= 65)
    .slice(0, 2)
    .map(([factor]) => STYLE_LABELS[factor]);

  if (styleTags.length === 0) styleTags.push("대형주");

  const riskScore = 100 - entry.factors.stability;
  const riskLabel: BasicStockView["riskLabel"] =
    riskScore <= 35 ? "낮음" : riskScore <= 65 ? "보통" : "높음";

  const aiScore = Math.round(
    entry.overallScore * 0.55 + (sorted[0]?.[1] ?? entry.overallScore) * 0.45
  );

  return {
    aiScore,
    attractiveness: entry.overallScore,
    riskLabel,
    styleTags,
    oneLiner: buildOneLiner(entry, sorted),
  };
}

function buildOneLiner(
  entry: RankingEntry,
  sorted: [FactorId, number][]
): string {
  const [top, second] = sorted;
  const q = entry.factors.quality;
  const g = entry.factors.growth;

  if (q >= 80 && g >= 80) {
    return "수익성과 성장성이 우수한 기업입니다.";
  }
  if (q >= 80) {
    return "재무 건전성과 수익성이 뛰어난 우량 기업입니다.";
  }
  if (g >= 80) {
    return "매출과 이익 성장세가 강한 성장 기업입니다.";
  }
  if (entry.factors.value >= 80) {
    return "동종 업종 대비 저평가 구간에 있는 가치주입니다.";
  }
  if (entry.factors.momentum >= 80) {
    return "최근 주가 추세가 강한 모멘텀 종목입니다.";
  }
  if (entry.factors.stability >= 80) {
    return "변동성이 낮고 안정적인 투자 후보입니다.";
  }

  if (top && second) {
    return `${STYLE_LABELS[top[0]]} 성향이 강하며 ${STYLE_LABELS[second[0]]} 특성도 보입니다.`;
  }

  return entry.aiSummary.split(".")[0] + ".";
}

export function deriveBasicStockViewFromStrategy(
  item: StrategyResult
): BasicStockView {
  const score = item.strategyScore;
  const riskLabel: BasicStockView["riskLabel"] =
    score >= 75 ? "낮음" : score >= 55 ? "보통" : "높음";

  const aiScore = Math.round(
    score * 0.6 + (item.companyScore ?? score) * 0.4
  );

  const styleTags =
    item.tags.length > 0 ? item.tags.slice(0, 3) : ["대형주"];

  const oneLiner =
    item.reasons.length > 0
      ? item.reasons[0]
      : score >= 80
        ? "전략 기준 상위 종목으로 평가됩니다."
        : "전략 조건을 충족하는 종목입니다.";

  return {
    aiScore,
    attractiveness: score,
    riskLabel,
    styleTags,
    oneLiner,
  };
}

export function riskColor(label: BasicStockView["riskLabel"]): string {
  switch (label) {
    case "낮음":
      return "text-emerald-400";
    case "보통":
      return "text-amber-400";
    case "높음":
      return "text-rose-400";
  }
}
