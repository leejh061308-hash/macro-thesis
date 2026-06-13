import YahooFinance from "yahoo-finance2";
import { fetchYahoo } from "@/lib/yahoo-fetch";
import { withTimeout } from "@/lib/timeout";
import type { QuantMetrics } from "./types";
import type { StockDetail } from "@/lib/types";

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
] as const;

const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
  fetchOptions: {
    headers: { "User-Agent": YAHOO_USER_AGENT },
  },
});

const YAHOO_TIMEOUT = 12_000;
const ENRICH_CONCURRENCY = 10;

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function pct(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return Math.abs(n) > 1 ? n / 100 : n;
}

export function needsCoreFundamentalEnrich(m: QuantMetrics): boolean {
  return m.peRatio == null && m.pbRatio == null && m.roe == null;
}

export function needsFundamentalEnrich(m: QuantMetrics): boolean {
  return (
    needsCoreFundamentalEnrich(m) ||
    needsGrowthEnrich(m) ||
    m.operatingMargin == null
  );
}

export function needsValueEnrich(m: QuantMetrics): boolean {
  const hasPe = m.peRatio != null && m.peRatio > 0;
  const hasPb = m.pbRatio != null && m.pbRatio > 0;
  return !hasPe && !hasPb;
}

export function needsGrowthEnrich(m: QuantMetrics): boolean {
  return m.revenueGrowth == null && m.epsGrowth == null;
}

function applyFromQuoteSummary(
  m: QuantMetrics,
  sd: {
    trailingPE?: number;
    dividendYield?: number;
    marketCap?: number;
  } | undefined,
  fd: {
    returnOnEquity?: number;
    returnOnAssets?: number;
    debtToEquity?: number;
    operatingMargins?: number;
    profitMargins?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    freeCashflow?: number;
  } | undefined,
  ks: {
    trailingPE?: number;
    priceToBook?: number;
    pegRatio?: number;
    payoutRatio?: number;
    beta?: number;
    returnOnEquity?: number;
  } | undefined
): void {
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

function applyFromStockDetail(m: QuantMetrics, detail: StockDetail): void {
  if (m.peRatio == null) m.peRatio = detail.peRatio;
  if (m.pbRatio == null) m.pbRatio = detail.pbRatio;
  if (m.roe == null) m.roe = detail.roe;
  if (m.debtToEquity == null) m.debtToEquity = detail.debtToEquity;
  if (m.dividendYield == null) m.dividendYield = detail.dividendYield;
  if (m.marketCap == null) m.marketCap = detail.marketCap;
}

interface DirectQuoteSummaryResult {
  quoteSummary?: {
    result?: Array<{
      summaryDetail?: Parameters<typeof applyFromQuoteSummary>[1];
      financialData?: Parameters<typeof applyFromQuoteSummary>[2];
      defaultKeyStatistics?: Parameters<typeof applyFromQuoteSummary>[3];
    }>;
  };
}

async function enrichOneFromDirectApi(m: QuantMetrics): Promise<boolean> {
  const encoded = encodeURIComponent(m.ticker);
  const query =
    "modules=summaryDetail,financialData,defaultKeyStatistics&formatted=false";

  for (const host of YAHOO_HOSTS) {
    try {
      const response = await withTimeout(
        fetchYahoo(`${host}/v10/finance/quoteSummary/${encoded}?${query}`, {
          headers: {
            "User-Agent": YAHOO_USER_AGENT,
            Accept: "application/json",
          },
          cache: "no-store",
        }),
        YAHOO_TIMEOUT,
        "yahoo direct quoteSummary"
      );
      if (!response.ok) continue;

      const json = (await response.json()) as DirectQuoteSummaryResult;
      const block = json.quoteSummary?.result?.[0];
      if (!block) continue;

      applyFromQuoteSummary(
        m,
        block.summaryDetail,
        block.financialData,
        block.defaultKeyStatistics
      );
      return !needsFundamentalEnrich(m);
    } catch {
      // try next host
    }
  }
  return false;
}

async function enrichOneFromYahooLibrary(m: QuantMetrics): Promise<void> {
  const summary = await withTimeout(
    yahooFinance.quoteSummary(m.ticker, {
      modules: ["summaryDetail", "financialData", "defaultKeyStatistics"],
    }),
    YAHOO_TIMEOUT,
    "yahoo quant fundamentals"
  );

  applyFromQuoteSummary(
    m,
    summary.summaryDetail,
    summary.financialData,
    summary.defaultKeyStatistics
  );
}

async function enrichOneFromStockDetail(m: QuantMetrics): Promise<void> {
  const { fetchStockDetail } = await import("@/lib/yahoo");
  const detail = await withTimeout(
    fetchStockDetail(m.ticker),
    YAHOO_TIMEOUT,
    "yahoo detail fallback"
  );
  if (detail) applyFromStockDetail(m, detail);
}

async function enrichOneFromYahoo(
  m: QuantMetrics,
  options?: { skipDetailFallback?: boolean }
): Promise<void> {
  if (!needsFundamentalEnrich(m)) return;

  await enrichOneFromDirectApi(m);
  if (!needsFundamentalEnrich(m)) return;

  try {
    await enrichOneFromYahooLibrary(m);
  } catch {
    // library 실패
  }
  if (!needsFundamentalEnrich(m)) return;

  if (!options?.skipDetailFallback) {
    await enrichOneFromStockDetail(m);
  }
}

export async function enrichGrowthFromYahoo(
  metrics: QuantMetrics[],
  options?: { concurrency?: number }
): Promise<void> {
  const needs = metrics.filter(needsGrowthEnrich);
  if (needs.length === 0) return;

  const concurrency = options?.concurrency ?? 4;
  let index = 0;

  async function enrichOneGrowth(m: QuantMetrics): Promise<void> {
    const encoded = encodeURIComponent(m.ticker);
    const query = "modules=financialData&formatted=false";

    for (const host of YAHOO_HOSTS) {
      try {
        const response = await withTimeout(
          fetchYahoo(`${host}/v10/finance/quoteSummary/${encoded}?${query}`, {
            headers: {
              "User-Agent": YAHOO_USER_AGENT,
              Accept: "application/json",
            },
            cache: "no-store",
          }),
          YAHOO_TIMEOUT,
          "yahoo growth financialData"
        );
        if (!response.ok) continue;

        const json = (await response.json()) as DirectQuoteSummaryResult;
        const fd = json.quoteSummary?.result?.[0]?.financialData;
        if (!fd) continue;

        if (m.revenueGrowth == null) m.revenueGrowth = pct(fd.revenueGrowth);
        if (m.epsGrowth == null) m.epsGrowth = pct(fd.earningsGrowth);
        if (m.operatingMargin == null) {
          m.operatingMargin = pct(fd.operatingMargins);
        }
        if (!needsGrowthEnrich(m)) return;
      } catch {
        // try next host
      }
    }

    if (needsGrowthEnrich(m)) {
      try {
        const summary = await withTimeout(
          yahooFinance.quoteSummary(m.ticker, { modules: ["financialData"] }),
          YAHOO_TIMEOUT,
          "yahoo growth library"
        );
        if (m.revenueGrowth == null) {
          m.revenueGrowth = pct(summary.financialData?.revenueGrowth);
        }
        if (m.epsGrowth == null) {
          m.epsGrowth = pct(summary.financialData?.earningsGrowth);
        }
        if (m.operatingMargin == null) {
          m.operatingMargin = pct(summary.financialData?.operatingMargins);
        }
      } catch {
        // library 실패
      }
    }
  }

  async function worker() {
    while (index < needs.length) {
      const i = index++;
      try {
        await enrichOneGrowth(needs[i]);
      } catch {
        // 개별 종목 실패는 무 ignore
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, needs.length) }, worker)
  );
}

export async function enrichValueFromYahoo(
  metrics: QuantMetrics[],
  options?: { concurrency?: number }
): Promise<void> {
  const needs = metrics.filter(needsValueEnrich);
  if (needs.length === 0) return;

  const concurrency = options?.concurrency ?? 4;
  let index = 0;

  async function enrichOneValue(m: QuantMetrics): Promise<void> {
    const encoded = encodeURIComponent(m.ticker);
    const query =
      "modules=summaryDetail,defaultKeyStatistics&formatted=false";

    for (const host of YAHOO_HOSTS) {
      try {
        const response = await withTimeout(
          fetchYahoo(`${host}/v10/finance/quoteSummary/${encoded}?${query}`, {
            headers: {
              "User-Agent": YAHOO_USER_AGENT,
              Accept: "application/json",
            },
            cache: "no-store",
          }),
          YAHOO_TIMEOUT,
          "yahoo value quoteSummary"
        );
        if (!response.ok) continue;

        const json = (await response.json()) as DirectQuoteSummaryResult;
        const block = json.quoteSummary?.result?.[0];
        if (!block) continue;

        applyFromQuoteSummary(
          m,
          block.summaryDetail,
          undefined,
          block.defaultKeyStatistics
        );
        if (!needsValueEnrich(m)) return;
      } catch {
        // try next host
      }
    }

    if (needsValueEnrich(m)) {
      try {
        const summary = await withTimeout(
          yahooFinance.quoteSummary(m.ticker, {
            modules: ["summaryDetail", "defaultKeyStatistics"],
          }),
          YAHOO_TIMEOUT,
          "yahoo value library"
        );
        applyFromQuoteSummary(
          m,
          summary.summaryDetail,
          undefined,
          summary.defaultKeyStatistics
        );
      } catch {
        // library 실패
      }
    }
  }

  async function worker() {
    while (index < needs.length) {
      const i = index++;
      try {
        await enrichOneValue(needs[i]);
      } catch {
        // 개별 종목 실패는 무시
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, needs.length) }, worker)
  );
}

export interface EnrichFundamentalsOptions {
  /** stock detail fallback 생략 (백그라운드 full enrich용) */
  skipDetailFallback?: boolean;
  concurrency?: number;
}

export async function enrichFundamentalsFromYahoo(
  metrics: QuantMetrics[],
  options?: EnrichFundamentalsOptions
): Promise<void> {
  const needs = metrics.filter(needsFundamentalEnrich);
  if (needs.length === 0) return;

  const concurrency = options?.concurrency ?? ENRICH_CONCURRENCY;
  let index = 0;

  async function worker() {
    while (index < needs.length) {
      const i = index++;
      try {
        await enrichOneFromYahoo(needs[i], {
          skipDetailFallback: options?.skipDetailFallback,
        });
      } catch {
        // 개별 종목 실패는 무시
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, needs.length) }, worker)
  );
}

export async function fetchYahooFundamentals(
  ticker: string
): Promise<Partial<QuantMetrics>> {
  const stub = { ticker, name: ticker } as QuantMetrics;
  try {
    await enrichOneFromYahoo(stub);
    return stub;
  } catch {
    return { ticker };
  }
}
