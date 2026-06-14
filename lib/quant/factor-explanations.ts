import { FACTOR_LABELS } from "./factors";
import type {
  DataConfidence,
  FactorId,
  FactorScores,
  FactorWeights,
  QuantMetrics,
} from "./types";

const GROWTH_REASONS: Array<{
  check: (m: QuantMetrics) => boolean;
  text: string;
}> = [
  {
    check: (m) => m.revenueGrowth != null && m.revenueGrowth >= 0.1,
    text: "매출 성장률",
  },
  {
    check: (m) => m.epsGrowth != null && m.epsGrowth >= 0.1,
    text: "EPS 성장률",
  },
  {
    check: (m) =>
      m.operatingIncomeGrowth != null && m.operatingIncomeGrowth >= 0.1,
    text: "영업이익 성장률",
  },
  {
    check: (m) => m.fcfGrowth != null && m.fcfGrowth >= 0.1,
    text: "잉여현금흐름 성장률",
  },
];

const QUALITY_REASONS: Array<{
  check: (m: QuantMetrics) => boolean;
  text: string;
}> = [
  { check: (m) => m.roe != null && m.roe >= 0.15, text: "ROE" },
  { check: (m) => m.roic != null && m.roic >= 0.12, text: "ROIC" },
  {
    check: (m) => m.operatingMargin != null && m.operatingMargin >= 0.15,
    text: "영업이익률",
  },
  { check: (m) => m.netMargin != null && m.netMargin >= 0.1, text: "순이익률" },
];

const VALUE_REASONS: Array<{
  check: (m: QuantMetrics) => boolean;
  text: string;
}> = [
  {
    check: (m) => m.peRatio != null && m.peRatio > 0 && m.peRatio <= 15,
    text: "저PER",
  },
  {
    check: (m) => m.pbRatio != null && m.pbRatio > 0 && m.pbRatio <= 2,
    text: "저PBR",
  },
  {
    check: (m) => m.freeCashFlowYield != null && m.freeCashFlowYield >= 0.04,
    text: "높은 FCF Yield",
  },
];

function confidenceLabel(level: DataConfidence): string {
  if (level === "low") return "데이터 신뢰도 낮음";
  if (level === "medium") return "데이터 신뢰도 보통";
  return "";
}

export function buildDetailedFactorSummary(
  metrics: QuantMetrics,
  scores: FactorScores,
  confidence: Partial<Record<FactorId, DataConfidence>>,
  overallScore: number,
  weights?: FactorWeights
): string {
  const sorted = (Object.entries(scores) as [FactorId, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const [topFactor, topScore] = sorted[0] ?? ["quality", 0];
  const [secondFactor, secondScore] = sorted[1] ?? ["growth", 0];
  const lowConf = (Object.entries(confidence) as [FactorId, DataConfidence][])
    .filter(([, c]) => c === "low")
    .map(([f]) => FACTOR_LABELS[f].shortName);

  const parts: string[] = [];

  if (topScore >= 70) {
    parts.push(
      buildFactorReason(topFactor, metrics, topScore, scores, weights)
    );
  }

  if (secondScore >= 60 && secondFactor !== topFactor) {
    const second = buildFactorReason(
      secondFactor,
      metrics,
      secondScore,
      scores,
      weights,
      true
    );
    if (second) parts.push(second);
  }

  if (parts.length === 0) {
    parts.push(
      `전체 유니버스 대비 종합 점수 ${overallScore}점이며 ${FACTOR_LABELS[topFactor].shortName} 팩터가 상대적 강점입니다.`
    );
  }

  const contrast = buildContrastSentence(scores);
  if (contrast) parts.push(contrast);

  if (lowConf.length > 0) {
    parts.push(
      `${lowConf.join(", ")} 팩터는 사용 가능 지표가 적어 ${confidenceLabel("low")}입니다.`
    );
  }

  return parts.join(" ");
}

function buildFactorReason(
  factor: FactorId,
  metrics: QuantMetrics,
  score: number,
  scores: FactorScores,
  weights?: FactorWeights,
  secondary = false
): string {
  const prefix = secondary ? "또한 " : "이 종목은 ";
  const label = FACTOR_LABELS[factor].shortName;

  switch (factor) {
    case "growth": {
      const hits = GROWTH_REASONS.filter((r) => r.check(metrics)).map(
        (r) => r.text
      );
      if (hits.length > 0) {
        return `${prefix}${label} 점수가 높습니다(${score}점). ${hits.join(", ")}이 유니버스 상위권에 속하기 때문입니다.`;
      }
      return `${prefix}${label} 점수가 상위권(${score}점)입니다.`;
    }
    case "quality": {
      const hits = QUALITY_REASONS.filter((r) => r.check(metrics)).map(
        (r) => r.text
      );
      if (hits.length > 0) {
        return `${prefix}${label} 점수가 높습니다(${score}점). ${hits.join(", ")}이 우수하기 때문입니다.`;
      }
      return `${prefix}${label} 점수가 상위권(${score}점)입니다.`;
    }
    case "value": {
      const hits = VALUE_REASONS.filter((r) => r.check(metrics)).map(
        (r) => r.text
      );
      if (hits.length > 0) {
        return `${prefix}${label} 점수가 높습니다(${score}점). ${hits.join(", ")} 매력이 있기 때문입니다.`;
      }
      return `${prefix}${label} 점수가 상위권(${score}점)입니다.`;
    }
    case "momentum":
      return `${prefix}${label} 점수가 높습니다(${score}점). 최근 3~12개월 주가 흐름이 강합니다.`;
    case "stability":
      return `${prefix}${label} 점수가 높습니다(${score}점). 변동성과 재무 안정성이 우수합니다.`;
    case "dividend":
      return `${prefix}${label} 점수가 높습니다(${score}점). 배당수익률과 배당 안정성이 양호합니다.`;
    default:
      if (weights && weights[factor] && weights[factor]! >= 40) {
        return `${prefix}${label} 팩터 가중치가 높은 전략에서 ${score}점으로 기여합니다.`;
      }
      return `${prefix}${label} 점수 ${score}점입니다.`;
  }
}

function buildContrastSentence(scores: FactorScores): string | null {
  if (scores.value >= 70 && scores.growth <= 40) {
    return "Value 점수는 높지만 Growth 점수는 낮습니다. 저평가 매력은 있으나 성장성은 제한적입니다.";
  }
  if (scores.growth >= 70 && scores.quality <= 40) {
    return "Growth 점수는 높지만 Quality 점수는 낮습니다. 성장성은 강하나 수익성·효율성은 아직 검증이 필요합니다.";
  }
  if (scores.momentum >= 75 && scores.value <= 35) {
    return "모멘텀은 강하지만 밸류에이션 부담이 클 수 있습니다.";
  }
  return null;
}
