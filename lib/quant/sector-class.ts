import { RATE_CUT_TICKERS, RATE_HIKE_TICKERS } from "./sectors";

export type SectorClass = "general" | "financial" | "reit" | "utility";

const FINANCIAL_EXTRA = new Set([
  "V",
  "MA",
  "PYPL",
  "SQ",
  "FISV",
  "ADP",
  "PAYX",
]);

const REIT_TICKERS = new Set([
  ...RATE_CUT_TICKERS,
  "O",
  "SPG",
  "PSA",
  "DLR",
  "CCI",
  "AVB",
  "EQR",
  "WELL",
  "VTR",
  "ARE",
  "BXP",
  "KIM",
  "REG",
  "HST",
  "VICI",
]);

const UTILITY_TICKERS = new Set([
  "NEE",
  "DUK",
  "SO",
  "AEP",
  "SRE",
  "D",
  "EXC",
  "XEL",
  "ED",
  "WEC",
  "ES",
  "PEG",
  "EIX",
  "FE",
  "AWK",
  "CEG",
]);

export const FINANCIAL_TICKERS = new Set([
  ...RATE_HIKE_TICKERS,
  ...FINANCIAL_EXTRA,
]);

export function getSectorClass(ticker: string): SectorClass {
  if (FINANCIAL_TICKERS.has(ticker)) return "financial";
  if (REIT_TICKERS.has(ticker)) return "reit";
  if (UTILITY_TICKERS.has(ticker)) return "utility";
  return "general";
}
