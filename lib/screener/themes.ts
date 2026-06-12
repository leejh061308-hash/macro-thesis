import type { MacroFilter } from "./types";
import {
  AI_BENEFICIARY_TICKERS,
  DATACENTER_THEME_TICKERS,
  DEFENSIVE_TICKERS,
  POWER_INFRA_THEME_TICKERS,
  RATE_CUT_TICKERS,
  RATE_HIKE_TICKERS,
  SEMICONDUCTOR_TICKERS,
  CLOUD_TICKERS,
  CYCLICAL_TICKERS,
  JPY_STRONG_BENEFICIARY,
  JPY_WEAK_BENEFICIARY,
} from "@/lib/quant/sectors";

export { CYCLICAL_TICKERS } from "@/lib/quant/sectors";

export const MACRO_FILTER_SETS: Record<MacroFilter, Set<string>> = {
  ai: AI_BENEFICIARY_TICKERS,
  datacenter: DATACENTER_THEME_TICKERS,
  "power-infra": POWER_INFRA_THEME_TICKERS,
  cloud: CLOUD_TICKERS,
  semiconductor: SEMICONDUCTOR_TICKERS,
  "rate-hike": RATE_HIKE_TICKERS,
  "rate-cut": RATE_CUT_TICKERS,
  cyclical: CYCLICAL_TICKERS,
  defensive: DEFENSIVE_TICKERS,
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
    datacenter: DATACENTER_THEME_TICKERS,
    "power-infra": POWER_INFRA_THEME_TICKERS,
    cloud: CLOUD_TICKERS,
    semiconductor: SEMICONDUCTOR_TICKERS,
  };
  const union = new Set<string>();
  for (const t of themes) {
    for (const ticker of map[t]) union.add(ticker);
  }
  return union;
}
