/** 주가 자동 갱신 간격 (ms) */
export const STOCK_REFRESH_INTERVAL = 30_000;

/** AI 분석 면책 문구 */
export const AI_DISCLAIMER =
  "AI 분석은 참고용이며, 투자 판단은 사용자 본인의 책임입니다.";

/** 퀀트·타이밍 점수 공통 면책 */
export const QUANT_DISCLAIMER =
  "전략 적합도·진입 점수·기업 점수는 상대 순위와 환경 지표이며, 매수·매도 추천이 아닙니다.";

/** 백테스트 한계 고지 */
export const BACKTEST_DISCLAIMER =
  "백테스트는 과거 데이터 기반 시뮬레이션이며, 미래 수익을 보장하지 않습니다. 거래비용·슬ippage는 반영되지 않을 수 있습니다.";

/** 데이터 출처 안내 */
export const DATA_SOURCE_NOTE =
  "재무·주가 데이터: Finnhub(설정 시) 및 Yahoo Finance. API 지연·누락이 발생할 수 있습니다.";

/** 퀀트 첫 로드 예상 시간 안내 */
export const QUANT_WARMUP_HINT =
  "첫 방문 시 종목 데이터를 수집합니다. 약 30초~1분 정도 걸릴 수 있습니다.";
