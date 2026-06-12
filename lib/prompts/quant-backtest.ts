import { getStrategy } from "@/lib/quant/strategies";
import type { BacktestStats, StrategyId } from "@/lib/quant/types";

export function buildBacktestInterpretPrompt(
  strategyId: StrategyId,
  strategyName: string,
  periodLabel: string,
  stats: BacktestStats,
  selectionNote: string
): string {
  const strategy = getStrategy(strategyId);

  return `다음은 "${strategyName}" 전략의 ${periodLabel} 백테스트 결과입니다.

## 전략 배경
${strategy.interpretGuide}

## 선정 기준 (공개)
${selectionNote}
평가 요소: ${strategy.criteria.join(", ")}

## 백테스트 수치
- 전략 누적 수익률: ${stats.totalReturn.toFixed(1)}%
- S&P500(SPY): ${stats.benchmarkReturn.toFixed(1)}%
- Nasdaq100(QQQ): ${stats.nasdaqReturn.toFixed(1)}%
- SPY 대비 초과수익: ${stats.excessReturn.toFixed(1)}%
- 연평균(CAGR): ${stats.cagr.toFixed(1)}%
- 최대 낙폭(MDD): ${stats.mdd.toFixed(1)}%
- 변동성: ${stats.volatility.toFixed(1)}%
- 샤프지수: ${stats.sharpe.toFixed(2)}

## 작성 지침
초보 투자자가 3~4문장으로 이해할 수 있게 작성하세요.
1) 왜 이 전략이 유효한지 (선정 기준과 연결)
2) 어떤 시장 환경에서 강한지 / 약한지
3) 수익과 리스크(변동성·MDD) 균형
과장·매수/매도 추천·미래 수익 보장 금지. 숫자 나열 대신 의미를 설명하세요.

JSON 형식: { "interpretation": "..." }`;
}

export const BACKTEST_INTERPRET_SYSTEM = `당신은 초보 투자자를 위한 퀀트 투자 해설가입니다.
- "왜 이 전략이 유효한지"와 "어떤 시장 환경에서 강한지"를 중심으로 설명합니다.
- 복잡한 수식은 쓰지 않고 자연어로 설명합니다.
- 투자 권유나 매수/매도 추천은 하지 않습니다.
- 한국어로 답변합니다.`;
