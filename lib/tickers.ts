const INDEX_NAMES: Record<string, string> = {
  "^IXIC": "나스닥 종합",
  "^KS11": "코스피",
  "^KQ11": "코스닥",
};

const INDEX_ALIASES: Record<string, string> = {
  IXIC: "^IXIC",
  KS11: "^KS11",
  KQ11: "^KQ11",
  "^IXIC": "^IXIC",
  "^KS11": "^KS11",
  "^KQ11": "^KQ11",
};

const EXCHANGE_LABELS: Record<string, string> = {
  KSC: "KOSPI",
  KOE: "KOSDAQ",
  KOQ: "KOSDAQ",
  KRX: "KRX",
  NMS: "NASDAQ",
  NYQ: "NYSE",
  PCX: "NYSE Arca",
  BTS: "BATS",
};

export function isIndexTicker(ticker: string): boolean {
  return ticker.startsWith("^");
}

export function isKoreanEquityTicker(ticker: string): boolean {
  return /^\d{6}\.(KS|KQ)$/i.test(ticker);
}

export function isKoreanMarketTicker(ticker: string): boolean {
  return (
    isKoreanEquityTicker(ticker) || ticker === "^KS11" || ticker === "^KQ11"
  );
}

function normalizeKoreanEquityInput(raw: string): string | null {
  const dotted = raw.match(/^(\d{6})\.(KS|KQ)$/i);
  if (dotted) {
    return `${dotted[1]}.${dotted[2].toUpperCase()}`;
  }

  if (/^\d{6}$/.test(raw)) {
    return `${raw}.KS`;
  }

  return null;
}

export function normalizeTicker(raw: string): string {
  const decoded = decodeURIComponent(raw).trim().toUpperCase();
  const aliased = INDEX_ALIASES[decoded] ?? decoded;
  return normalizeKoreanEquityInput(aliased) ?? aliased;
}

export function getIndexName(ticker: string): string {
  return INDEX_NAMES[ticker] ?? ticker;
}

export function formatExchangeLabel(exchange: string): string {
  const trimmed = exchange.trim();
  if (!trimmed) return "";
  return EXCHANGE_LABELS[trimmed] ?? trimmed;
}

export function inferCurrency(ticker: string): string {
  return isKoreanMarketTicker(normalizeTicker(ticker)) ? "KRW" : "USD";
}
