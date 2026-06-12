import type { BacktestPeriod, BacktestPoint, BacktestStats } from "./types";
import type { PricePoint } from "./yahoo-history";

export const PERIOD_LABELS: Record<BacktestPeriod, string> = {
  "1y": "1년",
  "3y": "3년",
  "5y": "5년",
  "10y": "10년",
};

export const PERIOD_MONTHS: Record<BacktestPeriod, number> = {
  "1y": 12,
  "3y": 36,
  "5y": 60,
  "10y": 120,
};

function sliceByPeriod(
  points: PricePoint[],
  period: BacktestPeriod
): PricePoint[] {
  const months = PERIOD_MONTHS[period];
  if (points.length <= months) return points;
  return points.slice(-months);
}

function alignSeries(
  seriesMap: Map<string, PricePoint[]>,
  tickers: string[]
): { dates: number[]; returns: Map<string, number[]> } {
  const allDates = new Set<number>();
  for (const ticker of tickers) {
    for (const p of seriesMap.get(ticker) ?? []) {
      allDates.add(p.timestamp);
    }
  }
  const dates = [...allDates].sort((a, b) => a - b);
  const returns = new Map<string, number[]>();

  for (const ticker of tickers) {
    const prices = seriesMap.get(ticker) ?? [];
    const priceMap = new Map(prices.map((p) => [p.timestamp, p.close]));
    const monthlyReturns: number[] = [];
    let prev: number | null = null;

    for (const date of dates) {
      const close = priceMap.get(date);
      if (close == null) {
        monthlyReturns.push(0);
        continue;
      }
      if (prev != null && prev > 0) {
        monthlyReturns.push((close - prev) / prev);
      } else {
        monthlyReturns.push(0);
      }
      prev = close;
    }
    returns.set(ticker, monthlyReturns);
  }

  return { dates, returns };
}

function portfolioReturns(
  tickers: string[],
  returns: Map<string, number[]>,
  length: number
): number[] {
  const portfolio: number[] = [];
  for (let i = 0; i < length; i++) {
    let sum = 0;
    let count = 0;
    for (const ticker of tickers) {
      const r = returns.get(ticker)?.[i];
      if (r != null) {
        sum += r;
        count++;
      }
    }
    portfolio.push(count > 0 ? sum / count : 0);
  }
  return portfolio;
}

function cumulativeFromReturns(monthlyReturns: number[]): number[] {
  const cumulative: number[] = [];
  let value = 1;
  for (const r of monthlyReturns) {
    value *= 1 + r;
    cumulative.push(value - 1);
  }
  return cumulative;
}

function computeStats(monthlyReturns: number[]) {
  const cumulative = cumulativeFromReturns(monthlyReturns);
  const totalReturn = cumulative.length > 0 ? cumulative[cumulative.length - 1] : 0;
  const years = monthlyReturns.length / 12;
  const cagr =
    years > 0 && totalReturn > -1
      ? Math.pow(1 + totalReturn, 1 / years) - 1
      : 0;

  let peak = 1;
  let maxDd = 0;
  let value = 1;
  for (const r of monthlyReturns) {
    value *= 1 + r;
    if (value > peak) peak = value;
    const dd = (value - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }

  const mean = monthlyReturns.reduce((s, r) => s + r, 0) / (monthlyReturns.length || 1);
  const variance =
    monthlyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) /
    (monthlyReturns.length || 1);
  const volatility = Math.sqrt(variance * 12);
  const winRate =
    monthlyReturns.filter((r) => r > 0).length / (monthlyReturns.length || 1);
  const sharpe = volatility > 0 ? (cagr - 0.04) / volatility : 0;

  return { totalReturn, cagr, mdd: maxDd, volatility, winRate, sharpe };
}

export function runBacktest(
  portfolioTickers: string[],
  spyTicker: string,
  nasdaqTicker: string,
  priceMap: Map<string, PricePoint[]>,
  period: BacktestPeriod
): { stats: BacktestStats; chart: BacktestPoint[] } {
  const sliced = new Map<string, PricePoint[]>();
  for (const [ticker, points] of priceMap) {
    sliced.set(ticker, sliceByPeriod(points, period));
  }

  const allTickers = [...portfolioTickers, spyTicker, nasdaqTicker];
  const { dates, returns } = alignSeries(sliced, allTickers);
  const length = dates.length;

  const strategyMonthly = portfolioReturns(portfolioTickers, returns, length);
  const spyMonthly = returns.get(spyTicker) ?? [];
  const nasdaqMonthly = returns.get(nasdaqTicker) ?? [];

  const strategyCum = cumulativeFromReturns(strategyMonthly);
  const spyCum = cumulativeFromReturns(spyMonthly);
  const nasdaqCum = cumulativeFromReturns(nasdaqMonthly);

  const strategyStats = computeStats(strategyMonthly);
  const spyStats = computeStats(spyMonthly);
  const nasdaqStats = computeStats(nasdaqMonthly);

  const chart: BacktestPoint[] = dates.map((ts, i) => ({
    date: new Date(ts).toLocaleDateString("ko-KR", {
      year: "2-digit",
      month: "short",
    }),
    strategyReturn: (strategyCum[i] ?? 0) * 100,
    benchmarkReturn: (spyCum[i] ?? 0) * 100,
    nasdaqReturn: (nasdaqCum[i] ?? 0) * 100,
  }));

  return {
    stats: {
      totalReturn: strategyStats.totalReturn * 100,
      benchmarkReturn: spyStats.totalReturn * 100,
      nasdaqReturn: nasdaqStats.totalReturn * 100,
      excessReturn: (strategyStats.totalReturn - spyStats.totalReturn) * 100,
      excessVsNasdaq: (strategyStats.totalReturn - nasdaqStats.totalReturn) * 100,
      cagr: strategyStats.cagr * 100,
      mdd: strategyStats.mdd * 100,
      volatility: strategyStats.volatility * 100,
      winRate: strategyStats.winRate * 100,
      sharpe: strategyStats.sharpe,
    },
    chart,
  };
}

export const BACKTEST_METHODOLOGY =
  "동일 선정 기준으로 상위 20종목을 동일 비중 구성하고, 월간 수익률을 합산합니다. 벤치마크는 S&P500(SPY)과 Nasdaq100(QQQ)입니다. 재무 지표는 최신 데이터 기준이며, 과거 시점 재무 변화는 반영하지 않습니다.";
