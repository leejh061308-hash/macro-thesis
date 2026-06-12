import type { StrategyId } from "@/lib/quant/types";
import {
  computeStrategyScore,
  computeStyleTags,
  getStrategy,
} from "@/lib/quant/strategies";
import {
  getStrategyPool,
  isThemeStrategy,
  passesThemeFilter,
} from "@/lib/quant/sectors";
import { buildSelectionReasons } from "@/lib/quant/strategy-reasons";
import { MACRO_FILTER_SETS, tickersForBeginnerThemes, tickersForMacroFilters, CYCLICAL_TICKERS } from "./themes";
import type {
  AdvancedFilters,
  BeginnerMacro,
  BeginnerStyle,
  BeginnerTheme,
  MacroFilter,
  RangeFilter,
  ScreenerRequest,
  ScreenerResult,
  ScreenerRunResponse,
  ScreenerStockData,
  SortField,
} from "./types";
import type { QuantMetrics } from "@/lib/quant/types";
import { computeCompanyScore } from "@/lib/timing/company-score";
import { computeTimingFromCloses } from "@/lib/timing/calculator";
import { fetchDailyCloses } from "@/lib/timing/technical";

const STYLE_STRATEGY: Record<BeginnerStyle, StrategyId> = {
  undervalued: "value",
  "high-growth": "growth",
  dividend: "dividend",
  quality: "quality-factor",
  "low-volatility": "momentum",
  defensive: "defensive",
  cyclical: "momentum",
};

const STYLE_LABELS: Record<BeginnerStyle, string> = {
  undervalued: "저평가 기업",
  "high-growth": "고성장 기업",
  dividend: "배당주",
  quality: "우량주",
  "low-volatility": "저변동성 기업",
  defensive: "경기방어주",
  cyclical: "경기민감주",
};

const MACRO_BEGINNER_MAP: Record<BeginnerMacro, MacroFilter[]> = {
  "rate-hike": ["rate-hike"],
  "rate-cut": ["rate-cut"],
  expansion: ["cyclical"],
  "recession-defense": ["defensive"],
};

function inRange(value: number | null | undefined, filter?: RangeFilter): boolean {
  if (!filter) return true;
  if (value == null) return false;
  if (filter.min != null && value < filter.min) return false;
  if (filter.max != null && value > filter.max) return false;
  return true;
}

function getField(
  stock: ScreenerStockData,
  field: keyof ScreenerStockData
): number | null {
  const v = stock[field];
  return typeof v === "number" ? v : null;
}

function passesAdvanced(stock: ScreenerStockData, f: AdvancedFilters): boolean {
  const checks: Array<[keyof ScreenerStockData, RangeFilter | undefined]> = [
    ["peRatio", f.peRatio],
    ["forwardPe", f.forwardPe],
    ["pbRatio", f.pbRatio],
    ["psr", f.psr],
    ["evToEbitda", f.evToEbitda],
    ["fcfYield", f.fcfYield],
    ["revenueGrowth", f.revenueGrowth],
    ["epsGrowth", f.epsGrowth],
    ["operatingMargin", f.operatingMargin],
    ["netMargin", f.netMargin],
    ["roe", f.roe],
    ["roa", f.roa],
    ["roic", f.roic],
    ["debtToEquity", f.debtToEquity],
    ["currentRatio", f.currentRatio],
    ["dividendYield", f.dividendYield],
    ["dividendGrowth", f.dividendGrowth],
    ["payoutRatio", f.payoutRatio],
    ["return1m", f.return1m],
    ["return3m", f.return3m],
    ["return6m", f.return6m],
    ["return12m", f.return12m],
    ["relativeStrength", f.relativeStrength],
    ["rsi", f.rsi],
    ["marketCap", f.marketCap],
    ["beta", f.beta],
  ];

  for (const [key, range] of checks) {
    if (range && !inRange(getField(stock, key), range)) return false;
  }

  if (f.aboveMa20 && !stock.aboveMa20) return false;
  if (f.aboveMa60 && !stock.aboveMa60) return false;
  if (f.aboveMa200 && !stock.aboveMa200) return false;
  if (f.goldenCross && !stock.goldenCross) return false;
  if (f.deathCross && !stock.deathCross) return false;
  if (f.near52WeekHigh && !stock.near52WeekHigh) return false;
  if (f.near52WeekLow && !stock.near52WeekLow) return false;

  return true;
}

function passesThematicPool(ticker: string, pool: Set<string> | null): boolean {
  if (!pool) return true;
  return pool.has(ticker);
}

function buildReasons(
  stock: ScreenerStockData,
  metrics: QuantMetrics,
  universe: QuantMetrics[],
  request: ScreenerRequest,
  strategyScores: Map<StrategyId, number>
): string[] {
  const reasons: string[] = [];

  if (request.beginner?.styles) {
    for (const style of request.beginner.styles) {
      const sid = STYLE_STRATEGY[style];
      const score = strategyScores.get(sid) ?? 0;
      if (score >= 65) reasons.push(`${STYLE_LABELS[style]} 조건 충족`);
    }
  }

  if (request.strategies) {
    for (const sid of request.strategies) {
      const score = strategyScores.get(sid) ?? 0;
      if (score >= 65) reasons.push(`${sid} 전략 점수 우수`);
    }
  }

  if (stock.peRatio != null && stock.peRatio > 0 && stock.peRatio <= 18) {
    reasons.push("PER 부담 낮음");
  }
  if (metrics.revenueGrowth != null && metrics.revenueGrowth >= 0.1) {
    reasons.push("매출 성장률 우수");
  }
  if (metrics.roe != null && metrics.roe >= 0.15) {
    reasons.push("ROE 우수");
  }
  if (metrics.debtToEquity != null && metrics.debtToEquity <= 1) {
    reasons.push("재무 건전성 우수");
  }
  if (metrics.dividendYield != null && metrics.dividendYield >= 0.025) {
    reasons.push("배당수익률 양호");
  }

  const themes = [
    ...(request.beginner?.themes ?? []),
    ...(request.macroFilters ?? []),
  ];
  if (themes.includes("ai") || request.macroFilters?.includes("ai")) {
    if (MACRO_FILTER_SETS.ai.has(stock.ticker)) reasons.push("AI 투자 확대 수혜");
  }
  if (request.macroFilters?.includes("semiconductor") && MACRO_FILTER_SETS.semiconductor.has(stock.ticker)) {
    reasons.push("반도체 테마 해당");
  }
  if (request.macroFilters?.includes("cloud") && MACRO_FILTER_SETS.cloud.has(stock.ticker)) {
    reasons.push("클라우드 테마 해당");
  }

  if (stock.rsi != null && stock.rsi >= 30 && stock.rsi <= 50) {
    reasons.push("과열 구간 아님");
  }
  if (stock.return1m != null && stock.return1m < -0.05 && stock.return12m != null && stock.return12m > 0) {
    reasons.push("최근 조정 후 반등 여지");
  }

  return [...new Set(reasons)].slice(0, 6);
}

function sortResults(
  results: ScreenerResult[],
  stockMap: Map<string, ScreenerStockData>,
  sort: SortField,
  dir: "asc" | "desc"
): ScreenerResult[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...results].sort((a, b) => {
    let av: number | null = null;
    let bv: number | null = null;
    if (sort === "companyScore") {
      av = a.companyScore;
      bv = b.companyScore;
    } else if (sort === "strategyScore") {
      av = a.strategyScore;
      bv = b.strategyScore;
    } else if (sort === "timingScore") {
      av = a.timingScore;
      bv = b.timingScore;
    } else {
      const sa = stockMap.get(a.ticker);
      const sb = stockMap.get(b.ticker);
      av = sa ? getField(sa, sort as keyof ScreenerStockData) : null;
      bv = sb ? getField(sb, sort as keyof ScreenerStockData) : null;
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * mul;
  });
}

function filterMetricsPass(
  m: QuantMetrics,
  universe: QuantMetrics[],
  request: ScreenerRequest
): boolean {
  let pool: Set<string> | null = null;

  if (request.beginner?.themes?.length) {
    pool = tickersForBeginnerThemes(request.beginner.themes);
  }
  if (request.beginner?.macro?.length) {
    const macroUnion = new Set<string>();
    for (const macro of request.beginner.macro) {
      for (const f of MACRO_BEGINNER_MAP[macro]) {
        for (const t of MACRO_FILTER_SETS[f]) macroUnion.add(t);
      }
    }
    pool = pool ? new Set([...pool].filter((t) => macroUnion.has(t))) : macroUnion;
  }
  if (request.macroFilters?.length) {
    const macroPool = tickersForMacroFilters(request.macroFilters);
    pool = pool && macroPool
      ? new Set([...pool].filter((t) => macroPool.has(t)))
      : macroPool ?? pool;
  }

  if (!passesThematicPool(m.ticker, pool)) return false;

  if (request.beginner?.styles?.length) {
    const stylePass = request.beginner.styles.some((style) => {
      if (style === "defensive") return passesThemeFilter("defensive", m.ticker);
      if (style === "cyclical") return CYCLICAL_TICKERS.has(m.ticker);
      const sid = STYLE_STRATEGY[style];
      return computeStrategyScore(sid, m, universe) >= 65;
    });
    if (!stylePass) return false;
  }

  if (request.strategies?.length) {
    const stratPass = request.strategies.some((sid) => {
      if (!passesThemeFilter(sid, m.ticker)) return false;
      const pool = getStrategyPool(sid, universe);
      if (isThemeStrategy(sid) && pool.length === 0) return false;
      return computeStrategyScore(sid, m, universe) >= 65;
    });
    if (!stratPass) return false;
  }

  return true;
}

export { filterMetricsPass };

export async function runScreenerEngine(
  request: ScreenerRequest,
  universe: QuantMetrics[],
  enriched: ScreenerStockData[]
): Promise<ScreenerRunResponse> {
  const stockMap = new Map(enriched.map((s) => [s.ticker, s]));
  const metricsMap = new Map(universe.map((m) => [m.ticker, m]));
  const appliedSummary: string[] = [];

  if (request.beginner?.styles?.length) {
    appliedSummary.push(
      `투자 스타일: ${request.beginner.styles.map((s) => STYLE_LABELS[s]).join(", ")}`
    );
  }
  if (request.strategies?.length) {
    const names = request.strategies.map((sid) => getStrategy(sid).shortName);
    appliedSummary.push(`전략: ${names.join(", ")}`);
  }
  if (request.macroFilters?.length) {
    appliedSummary.push(`거시경제 필터 ${request.macroFilters.length}개 적용`);
  }
  if (request.advanced && Object.keys(request.advanced).length > 0) {
    appliedSummary.push("고급 조건 적용");
  }

  const candidates = enriched.filter((stock) => {
    const m = metricsMap.get(stock.ticker);
    if (!m) return false;
    if (!filterMetricsPass(m, universe, request)) return false;
    if (request.advanced && !passesAdvanced(stock, request.advanced)) return false;
    return true;
  });

  const limit = request.limit ?? 50;
  const preliminary: ScreenerResult[] = [];

  const primaryStrategyId = request.strategies?.[0] ?? null;

  for (const stock of candidates) {
    const m = metricsMap.get(stock.ticker)!;
    const companyScore = computeCompanyScore(m, universe);
    const tags = computeStyleTags(m, universe);

    let strategyScore: number | null = null;
    let reasons: string[] = [];

    if (primaryStrategyId) {
      if (passesThemeFilter(primaryStrategyId, m.ticker)) {
        const pool = getStrategyPool(primaryStrategyId, universe);
        strategyScore = computeStrategyScore(primaryStrategyId, m, universe);
        reasons = buildSelectionReasons(primaryStrategyId, m, pool, strategyScore);
      }
    } else if (request.strategies?.length) {
      for (const sid of request.strategies) {
        if (!passesThemeFilter(sid, m.ticker)) continue;
        const pool = getStrategyPool(sid, universe);
        const score = computeStrategyScore(sid, m, universe);
        if (score >= 65) {
          strategyScore = Math.max(strategyScore ?? 0, score);
          reasons.push(...buildSelectionReasons(sid, m, pool, score));
        }
      }
      reasons = [...new Set(reasons)].slice(0, 5);
    } else {
      reasons = buildReasons(stock, m, universe, request, new Map());
    }

    if (reasons.length === 0) reasons.push("선택 조건 충족");

    preliminary.push({
      ticker: stock.ticker,
      name: stock.name,
      price: stock.price,
      currency: stock.currency,
      strategyScore,
      companyScore,
      timingScore: null,
      tags,
      reasons,
      rank: 0,
    });
  }

  let sorted = sortResults(
    preliminary,
    stockMap,
    request.sort === "timingScore"
      ? "companyScore"
      : request.sort === "strategyScore"
        ? "strategyScore"
        : (request.sort ?? "companyScore"),
    request.sortDir ?? "desc"
  ).slice(0, limit);

  const timingSlice = sorted.slice(0, 25);
  await Promise.all(
    timingSlice.map(async (item) => {
      const m = metricsMap.get(item.ticker)!;
      try {
        const closes = await fetchDailyCloses(item.ticker, "6mo");
        if (closes.length >= 30) {
          item.timingScore = computeTimingFromCloses(m, closes).score;
        }
      } catch {
        // ignore
      }
    })
  );

  if (request.sort === "timingScore") {
    sorted = sortResults(sorted, stockMap, "timingScore", request.sortDir ?? "desc");
  }

  const results = sorted.map((r, i) => ({ ...r, rank: i + 1 }));

  return {
    results,
    count: results.length,
    appliedSummary,
  };
}

export function beginnerStylesToRequest(
  styles: BeginnerStyle[],
  themes: BeginnerTheme[],
  macro: BeginnerMacro[]
): Partial<ScreenerRequest> {
  return {
    mode: "beginner",
    beginner: { styles, themes, macro },
    strategies: styles
      .filter((s) => s !== "cyclical" && s !== "defensive")
      .map((s) => STYLE_STRATEGY[s]),
  };
}
