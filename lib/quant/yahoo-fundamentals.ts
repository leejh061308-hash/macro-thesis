import YahooFinance from "yahoo-finance2";
import { withTimeout } from "@/lib/timeout";
import type { QuantMetrics } from "./types";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
  fetchOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  },
});

const YAHOO_TIMEOUT = 12_000;
const ENRICH_CONCURRENCY = 4;

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

/** Yahoo는 소수(0.15) 또는 퍼센트(15) 형식을 혼용 */
function pct(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return Math.abs(n) > 1 ? n / 100 : n;
}

export function needsFundamentalEnrich(m: QuantMetrics): boolean {
  return (
    m.peRatio == null &&
    m.pbRatio == null &&
    m.roe == null &&
    m.revenueGrowth == null
  );
}

async function enrichOneFromYahoo(m: QuantMetrics): Promise<void> {
  const summary = await withTimeout(
    yahooFinance.quoteSummary(m.ticker, {
      modules: ["summaryDetail", "financialData", "defaultKeyStatistics"],
    }),
    YAHOO_TIMEOUT,
    "yahoo quant fundamentals"
  );

  const sd = summary.summaryDetail;
  const fd = summary.financialData;
  const ks = summary.defaultKeyStatistics;

  if (m.peRatio == null) {
    m.peRatio = num(sd?.trailingPE) ?? num(ks?.trailingPE);
  }
  if (m.pbRatio == null) m.pbRatio = num(ks?.priceToBook);
  if (m.pegRatio == null) m.pegRatio = num(ks?.pegRatio);
  if (m.roe == null) m.roe = pct(fd?.returnOnEquity);
  if (m.roic == null) m.roic = pct(ks?.returnOnEquity ?? fd?.returnOnAssets);
  if (m.debtToEquity == null) m.debtToEquity = num(fd?.debtToEquity);
  if (m.operatingMargin == null) m.operatingMargin = pct(fd?.operatingMargins);
  if (m.netMargin == null) m.netMargin = pct(fd?.profitMargins);
  if (m.revenueGrowth == null) m.revenueGrowth = pct(fd?.revenueGrowth);
  if (m.epsGrowth == null) m.epsGrowth = pct(fd?.earningsGrowth);
  if (m.dividendYield == null) m.dividendYield = pct(sd?.dividendYield);
  if (m.payoutRatio == null) m.payoutRatio = pct(ks?.payoutRatio);
  if (m.beta == null) m.beta = num(ks?.beta);

  const marketCap = num(sd?.marketCap);
  const fcf = num(fd?.freeCashflow);
  if (m.freeCashFlowYield == null && fcf != null && marketCap != null && marketCap > 0) {
    m.freeCashFlowYield = fcf / marketCap;
  }
  if (m.marketCap == null && marketCap != null) {
    m.marketCap = marketCap;
  }
}

/** Finnhub metric 누락 시 Yahoo quoteSummary로 재무 지표 보완 */
export async function enrichFundamentalsFromYahoo(
  metrics: QuantMetrics[]
): Promise<void> {
  const needs = metrics.filter(needsFundamentalEnrich);
  if (needs.length === 0) return;

  let index = 0;
  async function worker() {
    while (index < needs.length) {
      const i = index++;
      try {
        await enrichOneFromYahoo(needs[i]);
      } catch {
        // 개별 종목 실패는 무시
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(ENRICH_CONCURRENCY, needs.length) }, worker)
  );
}

export async function fetchYahooFundamentals(
  ticker: string
): Promise<Partial<QuantMetrics>> {
  const partial: Partial<QuantMetrics> = { ticker };
  const stub = { ticker, name: ticker } as QuantMetrics;
  try {
    await enrichOneFromYahoo(stub);
    return stub;
  } catch {
    return partial;
  }
}
