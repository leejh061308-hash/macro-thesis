import type { QuantMetrics } from "@/lib/quant/types";
import { AI_BENEFICIARY_TICKERS, DEFENSIVE_TICKERS, RATE_CUT_TICKERS, RATE_HIKE_TICKERS } from "@/lib/quant/sectors";
import type { TimingBreakdown } from "./types";
import {
  computeRsi,
  computeVolatility,
  maxDrawdown,
  sma,
  trailingReturn,
  type DailyClose,
} from "./technical";

/** 단순 거시 레짐: 금리 고점 안정 구간 가정 (중립~인하 기대) */
const MACRO_REGIME = {
  rateBias: "neutral" as "hike" | "cut" | "neutral",
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function scoreLowerBetter(value: number | null, low: number, high: number): number {
  if (value == null || value <= 0) return 50;
  if (value <= low) return 90;
  if (value >= high) return 20;
  return clamp(90 - ((value - low) / (high - low)) * 70);
}

function scoreValuation(metrics: QuantMetrics): number {
  const pe = metrics.peRatio;
  const pb = metrics.pbRatio;
  const ev = metrics.evToEbitda;

  const peScore = scoreLowerBetter(pe, 12, 35);
  const pbScore = scoreLowerBetter(pb, 1.5, 6);
  const evScore = scoreLowerBetter(ev, 8, 25);

  let histPeScore = 50;
  if (pe != null && pe > 0) {
    const avgPe = 20;
    const ratio = pe / avgPe;
    histPeScore = ratio <= 0.85 ? 90 : ratio <= 1.0 ? 75 : ratio <= 1.2 ? 55 : ratio <= 1.5 ? 35 : 20;
  }

  return clamp(peScore * 0.3 + pbScore * 0.2 + evScore * 0.2 + histPeScore * 0.3);
}

function scoreMomentum(closes: number[]): number {
  const price = closes[closes.length - 1];
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const ma200 = sma(closes, 200);

  if (!ma20 || !ma60) return 50;

  let score = 50;

  if (ma200 && price > ma200) score += 15;
  else if (ma200 && price < ma200) score -= 10;

  const vs20 = (price - ma20) / ma20;
  const vs60 = (price - ma60) / ma60;

  if (vs20 >= -0.03 && vs20 <= 0.05) score += 20;
  else if (vs20 > 0.05 && vs20 <= 0.12) score += 5;
  else if (vs20 > 0.12) score -= 15;

  if (vs60 >= -0.08 && vs60 <= 0.02) score += 15;
  else if (price > ma60 && price < ma20) score += 10;

  if (ma20 > ma60 && ma60 && (!ma200 || ma60 > ma200)) score += 10;

  return clamp(score);
}

function scoreOverheating(closes: number[]): number {
  const rsi = computeRsi(closes);
  const ret1m = trailingReturn(closes, 21);
  const ret3m = trailingReturn(closes, 63);

  let rsiScore = 50;
  if (rsi != null) {
    if (rsi >= 30 && rsi <= 45) rsiScore = 90;
    else if (rsi > 45 && rsi <= 55) rsiScore = 75;
    else if (rsi > 55 && rsi <= 65) rsiScore = 55;
    else if (rsi > 65 && rsi <= 75) rsiScore = 35;
    else if (rsi > 75) rsiScore = 15;
    else rsiScore = 70;
  }

  let riseScore = 70;
  if (ret1m != null) {
    if (ret1m > 0.2) riseScore = 20;
    else if (ret1m > 0.12) riseScore = 40;
    else if (ret1m > 0.05) riseScore = 60;
    else if (ret1m < -0.15) riseScore = 75;
    else if (ret1m < -0.05) riseScore = 80;
  }

  let fallBonus = 50;
  if (ret3m != null && ret1m != null && ret3m > 0.1 && ret1m < -0.03) {
    fallBonus = 85;
  }

  return clamp(rsiScore * 0.5 + riseScore * 0.3 + fallBonus * 0.2);
}

function scoreVolatilityComponent(
  closes: number[],
  metrics: QuantMetrics
): number {
  const vol = computeVolatility(closes) ?? metrics.volatility;
  const beta = metrics.beta;
  const mdd = maxDrawdown(closes) ?? metrics.maxDrawdown;

  const volScore = vol != null ? scoreLowerBetter(vol, 0.15, 0.45) : 50;
  const betaScore = beta != null ? scoreLowerBetter(beta, 0.8, 1.5) : 50;
  const mddScore = mdd != null ? scoreLowerBetter(mdd, 0.1, 0.35) : 50;

  return clamp(volScore * 0.4 + betaScore * 0.35 + mddScore * 0.25);
}

function scoreMacroFit(ticker: string): number {
  const isDefensive = DEFENSIVE_TICKERS.has(ticker);
  const isAi = AI_BENEFICIARY_TICKERS.has(ticker);
  const isRateHike = RATE_HIKE_TICKERS.has(ticker);
  const isRateCut = RATE_CUT_TICKERS.has(ticker);

  switch (MACRO_REGIME.rateBias) {
    case "hike":
      if (isRateHike) return 85;
      if (isDefensive) return 70;
      if (isRateCut) return 40;
      if (isAi) return 55;
      return 55;
    case "cut":
      if (isRateCut) return 85;
      if (isAi) return 80;
      if (isRateHike) return 45;
      if (isDefensive) return 60;
      return 60;
    default:
      if (isDefensive) return 72;
      if (isAi) return 78;
      if (isRateHike) return 65;
      if (isRateCut) return 68;
      return 62;
  }
}

export function computeTimingBreakdown(
  metrics: QuantMetrics,
  closes: number[]
): TimingBreakdown {
  return {
    valuation: scoreValuation(metrics),
    momentum: closes.length >= 20 ? scoreMomentum(closes) : 50,
    overheating: closes.length >= 20 ? scoreOverheating(closes) : 50,
    volatility: scoreVolatilityComponent(closes, metrics),
    macro: scoreMacroFit(metrics.ticker),
  };
}

export function computeTimingScore(breakdown: TimingBreakdown): number {
  return clamp(
    breakdown.valuation * 0.3 +
      breakdown.momentum * 0.25 +
      breakdown.overheating * 0.2 +
      breakdown.volatility * 0.1 +
      breakdown.macro * 0.15
  );
}

export function buildRuleInterpretation(
  timingScore: number,
  companyScore: number,
  breakdown: TimingBreakdown,
  metrics: QuantMetrics
): string {
  const parts: string[] = [];

  if (companyScore >= 75) {
    parts.push("기업 경쟁력은 우수한 편입니다.");
  } else if (companyScore >= 60) {
    parts.push("기업 펀더멘털은 양호한 수준입니다.");
  } else {
    parts.push("기업 펀더멘털은 보통 이하로 추가 확인이 필요합니다.");
  }

  if (breakdown.valuation >= 75) {
    parts.push("현재 밸류에이션 부담은 역사적 평균 대비 크지 않습니다.");
  } else if (breakdown.valuation <= 45) {
    parts.push("밸류에이션 부담이 상대적으로 높은 구간입니다.");
  }

  if (breakdown.overheating <= 40) {
    parts.push("최근 상승폭이 커 단기 과열 가능성을 염두에 두면 좋습니다.");
  } else if (breakdown.overheating >= 75 && breakdown.momentum >= 65) {
    parts.push("최근 조정으로 진입 매력도가 개선되는 흐름이 관찰됩니다.");
  } else if (breakdown.momentum >= 75) {
    parts.push("중기 추세는 양호하나 진입 타이밍은 세분화해 볼 필요가 있습니다.");
  }

  if (timingScore >= 80) {
    parts.push("종합적으로 현재 진입 매력도는 높은 편입니다.");
  } else if (timingScore >= 70) {
    parts.push("관심 구간으로 볼 수 있으나 추가 확인을 권장합니다.");
  } else if (timingScore < 55) {
    parts.push("현재는 신중하게 접근할 구간으로 해석됩니다.");
  }

  if (parts.length === 0) {
    return "기업 점수와 진입 점수를 함께 참고해 판단해 주세요.";
  }

  return parts.join(" ");
}

export function computeTimingFromCloses(
  metrics: QuantMetrics,
  closes: DailyClose[],
  upToIndex?: number
): { score: number; breakdown: TimingBreakdown } {
  const prices = upToIndex != null
    ? closes.slice(0, upToIndex + 1).map((p) => p.close)
    : closes.map((p) => p.close);
  const breakdown = computeTimingBreakdown(metrics, prices);
  return { score: computeTimingScore(breakdown), breakdown };
}
