const INDEX_NAMES: Record<string, string> = {
  "^IXIC": "나스닥 종합",
  "^KS11": "코스피",
};

const INDEX_ALIASES: Record<string, string> = {
  IXIC: "^IXIC",
  KS11: "^KS11",
  "^IXIC": "^IXIC",
  "^KS11": "^KS11",
};

export function isIndexTicker(ticker: string): boolean {
  return ticker.startsWith("^");
}

export function normalizeTicker(raw: string): string {
  const decoded = decodeURIComponent(raw).trim().toUpperCase();
  return INDEX_ALIASES[decoded] ?? decoded;
}

export function getIndexName(ticker: string): string {
  return INDEX_NAMES[ticker] ?? ticker;
}
