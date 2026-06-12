import type { BacktestStats } from "@/lib/quant/types";

export function buildBacktestInterpretPrompt(
  strategyName: string,
  periodLabel: string,
  stats: BacktestStats
): string {
  return `다음은 "${strategyName}" 전략의 ${periodLabel} 백테스트 결과입니다. 초보 투자자가 이해하기 쉽게 2~3문장으로 해석해주세요. 과장하지 말고 객관적으로 설명하세요. 미래 수익을 보장한다는 표현은 금지입니다.

- 전략 누적 수익률: ${stats.totalReturn.toFixed(1)}%
- S&P500(SPY) 수익률: ${stats.benchmarkReturn.toFixed(1)}%
- 초과 수익: ${stats.excessReturn.toFixed(1)}%
- 연평균 수익률(CAGR): ${stats.cagr.toFixed(1)}%
- 최대 낙폭(MDD): ${stats.mdd.toFixed(1)}%
- 변동성: ${stats.volatility.toFixed(1)}%
- 승률: ${stats.winRate.toFixed(1)}%
- 샤프지수: ${stats.sharpe.toFixed(2)}

JSON 형식으로 응답: { "interpretation": "..." }`;
}

export const BACKTEST_INTERPRET_SYSTEM = `당신은 초보 투자자를 위한 퀀트 투자 해설가입니다.
- 숫자를 나열하지 말고 의미를 설명합니다.
- 수익과 리스크를 균형 있게 설명합니다.
- 투자 권유나 매수/매도 추천은 하지 않습니다.
- 한국어로 답변합니다.`;
