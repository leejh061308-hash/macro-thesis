export type MarketSession = "regular";

export interface ResolvedMarketQuote {
  price: number;
  change: number;
  changePercent: number;
  session: MarketSession;
}

export interface YahooQuoteLike {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  /** Yahoo v8 chart / spark meta field */
  chartPreviousClose?: number;
  previousClose?: number;
}

function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

/** 정규장(본장) 시세만 반환합니다. 장외마켓은 반영하지 않습니다. */
export function resolveMarketQuote(
  quote: YahooQuoteLike
): ResolvedMarketQuote | null {
  const previousClose =
    quote.regularMarketPreviousClose ??
    quote.chartPreviousClose ??
    quote.previousClose;
  const regularPrice = quote.regularMarketPrice;

  if (!previousClose || regularPrice == null) return null;

  const change = quote.regularMarketChange ?? regularPrice - previousClose;
  const changePercent =
    quote.regularMarketChangePercent ?? pctChange(previousClose, regularPrice);

  return {
    price: regularPrice,
    change,
    changePercent,
    session: "regular",
  };
}

/** 차트 Y축 눈금 포맷 */
export function formatChartYAxis(value: number, prices: number[]): string {
  if (prices.length === 0) return value.toFixed(2);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = max - min;

  if (spread < 2) return value.toFixed(2);
  if (spread < 20) return value.toFixed(1);
  if (value >= 1000) return value.toFixed(0);
  return value.toFixed(2);
}
