import { FACTOR_LABELS } from "./factors";
import type {
  FactorContributionItem,
  FactorContributionResult,
  FactorId,
  FactorScores,
  FactorWeights,
} from "./types";

const NEUTRAL = 50;

export type { FactorContributionItem, FactorContributionResult };

export function computeFactorContribution(
  factors: FactorScores,
  weights: FactorWeights
): FactorContributionResult {
  const entries = (Object.entries(weights) as [FactorId, number][]).filter(
    ([, w]) => (w ?? 0) > 0
  );
  const totalWeight = entries.reduce((s, [, w]) => s + (w ?? 0), 0) || 1;

  const items: FactorContributionItem[] = entries.map(([factor, w]) => {
    const weight = w ?? 0;
    const score = factors[factor];
    const contribution = Math.round(((score - NEUTRAL) * weight) / totalWeight);
    return {
      factor,
      label: FACTOR_LABELS[factor].shortName,
      score,
      contribution,
    };
  });

  const adjustedOverall = entries.reduce(
    (s, [factor, w]) => s + factors[factor] * (w ?? 0),
    0
  );
  const finalScore =
    totalWeight > 0 ? Math.round(adjustedOverall / totalWeight) : 0;

  return {
    overallScore: finalScore,
    baseline: NEUTRAL,
    items: items.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
    aiExplanation: buildContributionExplanation(items, finalScore),
  };
}

function buildContributionExplanation(
  items: FactorContributionItem[],
  overall: number
): string {
  const positive = items.filter((i) => i.contribution > 0).sort((a, b) => b.contribution - a.contribution);
  const negative = items.filter((i) => i.contribution < 0).sort((a, b) => a.contribution - b.contribution);

  if (positive.length === 0) {
    return `종합 점수 ${overall}점 — 모든 팩터가 중립(50) 이하로 총점을 끌어내리고 있습니다.`;
  }

  const top = positive.slice(0, 2).map((i) => i.label).join("·");
  let msg = `종합 ${overall}점 — ${top} 팩터가 총점 상승에 가장 크게 기여했습니다.`;
  if (negative.length > 0) {
    msg += ` ${negative[0].label} 팩터(${negative[0].contribution})가 상대적으로 약합니다.`;
  }
  return msg;
}
