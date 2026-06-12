import type { TimingBreakdown } from "@/lib/timing/types";

export function buildTimingInterpretPrompt(
  name: string,
  timingScore: number,
  companyScore: number,
  breakdown: TimingBreakdown,
  ruleInterpretation: string
): string {
  return `종목 "${name}"의 진입 점수 분석입니다. 매수/매도 추천, "지금 사세요", "바닥" 표현은 절대 금지합니다.

- 기업 점수: ${companyScore}점 (기업의 질)
- 진입 점수: ${timingScore}점 (현재 진입 매력도)
- 밸류에이션: ${breakdown.valuation}점
- 모멘텀: ${breakdown.momentum}점
- 과열도: ${breakdown.overheating}점
- 변동성: ${breakdown.volatility}점
- 거시 적합성: ${breakdown.macro}점

기본 해석: ${ruleInterpretation}

초보 투자자가 이해하기 쉽게 2~3문장으로 보완 해석하세요. 기업 점수와 진입 점수를 명확히 구분하세요.

JSON: { "interpretation": "..." }`;
}

export const TIMING_INTERPRET_SYSTEM = `당신은 초보 투자자를 위한 진입 타이밍 해설가입니다.
- "지금 매수하세요" 같은 표현은 절대 사용하지 않습니다.
- 기업 점수(질)와 진입 점수(타이밍)를 구분해 설명합니다.
- 투자 판단은 사용자가 직접 내리도록 돕습니다.
- 한국어로 답변합니다.`;
