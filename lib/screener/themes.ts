import type { MacroFilter } from "./types";

export const SEMICONDUCTOR_TICKERS = new Set([
  "NVDA", "AMD", "AVGO", "MU", "LRCX", "KLAC", "INTC", "TXN", "QCOM", "ADI", "SNPS", "CDNS",
]);

export const DATACENTER_TICKERS = new Set([
  "EQIX", "AMT", "PLD", "DLR", "AMZN", "MSFT", "GOOGL", "META", "ORCL", "CRM",
]);

export const POWER_INFRA_TICKERS = new Set([
  "NEE", "DUK", "SO", "GE", "CAT", "ETN", "VRT", "CEG",
]);

export const CLOUD_TICKERS = new Set([
  "MSFT", "AMZN", "GOOGL", "CRM", "NOW", "ORCL", "SNOW", "ADBE", "IBM", "ACN",
]);

export const CYCLICAL_TICKERS = new Set([
  "CAT", "DE", "BA", "GE", "XOM", "CVX", "FCX", "NUE", "LMT", "RTX", "HON", "MMM",
  "GM", "F", "LOW", "HD", "BKNG", "SBUX", "NKE",
]);

export const JPY_STRONG_BENEFICIARY = new Set([
  "TM", "HMC", "SONY", "MUFG", "SMFG",
]);

export const JPY_WEAK_BENEFICIARY = new Set([
  "PG", "KO", "WMT", "COST", "MCD", "CL", "JNJ", "UNH",
]);

export const MACRO_FILTER_SETS: Record<MacroFilter, Set<string>> = {
  ai: new Set([
    "NVDA", "AMD", "AVGO", "MSFT", "GOOGL", "META", "ORCL", "CRM", "NOW", "PANW", "ADBE", "AMZN", "EQIX", "ACN", "IBM",
  ]),
  datacenter: DATACENTER_TICKERS,
  "power-infra": POWER_INFRA_TICKERS,
  cloud: CLOUD_TICKERS,
  semiconductor: SEMICONDUCTOR_TICKERS,
  "rate-hike": new Set([
    "JPM", "BAC", "GS", "MS", "BLK", "SPGI", "AXP", "C", "WFC", "SCHW", "CB", "BRK-B", "MET", "PRU", "CI",
  ]),
  "rate-cut": new Set([
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "CRM", "NFLX", "ADBE", "NOW",
    "PLD", "AMT", "EQIX", "O", "SPG", "PSA",
  ]),
  cyclical: CYCLICAL_TICKERS,
  defensive: new Set([
    "PG", "KO", "PEP", "CL", "MO", "PM", "WMT", "COST", "MCD", "JNJ", "MRK", "LLY", "PFE", "ABT", "UNH",
    "SO", "DUK", "NEE", "AMGN", "GILD",
  ]),
  "jpy-strong": JPY_STRONG_BENEFICIARY,
  "jpy-weak": JPY_WEAK_BENEFICIARY,
};

export function tickersForMacroFilters(filters: MacroFilter[]): Set<string> | null {
  if (filters.length === 0) return null;
  const union = new Set<string>();
  for (const f of filters) {
    for (const t of MACRO_FILTER_SETS[f]) union.add(t);
  }
  return union;
}

export function resolveTickerPool(request: {
  beginner?: { themes?: Array<"ai" | "datacenter" | "power-infra" | "cloud" | "semiconductor">; macro?: Array<"rate-hike" | "rate-cut" | "expansion" | "recession-defense"> };
  macroFilters?: MacroFilter[];
}): Set<string> | null {
  let pool: Set<string> | null = null;

  if (request.beginner?.themes?.length) {
    pool = tickersForBeginnerThemes(request.beginner.themes);
  }
  if (request.beginner?.macro?.length) {
    const macroMap: Record<string, MacroFilter[]> = {
      "rate-hike": ["rate-hike"],
      "rate-cut": ["rate-cut"],
      expansion: ["cyclical"],
      "recession-defense": ["defensive"],
    };
    const macroUnion = new Set<string>();
    for (const macro of request.beginner.macro) {
      for (const f of macroMap[macro] ?? []) {
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

  return pool;
}

export function tickersForBeginnerThemes(
  themes: Array<"ai" | "datacenter" | "power-infra" | "cloud" | "semiconductor">
): Set<string> | null {
  if (themes.length === 0) return null;
  const map = {
    ai: MACRO_FILTER_SETS.ai,
    datacenter: DATACENTER_TICKERS,
    "power-infra": POWER_INFRA_TICKERS,
    cloud: CLOUD_TICKERS,
    semiconductor: SEMICONDUCTOR_TICKERS,
  };
  const union = new Set<string>();
  for (const t of themes) {
    for (const ticker of map[t]) union.add(ticker);
  }
  return union;
}
