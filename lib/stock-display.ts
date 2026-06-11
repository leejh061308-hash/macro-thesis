import { getKoreanStockCanonicalName } from "@/lib/korean-stocks";
import {
  getIndexName,
  isIndexTicker,
  isKoreanEquityTicker,
  isKoreanMarketTicker,
  normalizeTicker,
} from "@/lib/tickers";

function hasHangul(text: string): boolean {
  return /[\u3131-\uD79D]/.test(text);
}

export function usesStockNameAsHeadline(ticker: string): boolean {
  const normalized = normalizeTicker(ticker);
  return (
    isKoreanEquityTicker(normalized) ||
    (isIndexTicker(normalized) && isKoreanMarketTicker(normalized))
  );
}

export function resolveStockDisplayName(ticker: string, name = ""): string {
  const normalized = normalizeTicker(ticker);

  if (isIndexTicker(normalized) && isKoreanMarketTicker(normalized)) {
    return getIndexName(normalized);
  }

  if (isKoreanEquityTicker(normalized)) {
    const canonical = getKoreanStockCanonicalName(normalized);
    if (canonical) return canonical;
    if (hasHangul(name)) return name;
    return name || normalized;
  }

  return name || normalized;
}

export function getStockHeadline(ticker: string, name = ""): {
  primary: string;
  secondary: string;
} {
  const displayName = resolveStockDisplayName(ticker, name);

  if (usesStockNameAsHeadline(ticker)) {
    const normalized = normalizeTicker(ticker);
    return {
      primary: displayName,
      secondary: isIndexTicker(normalized) ? normalized : normalized,
    };
  }

  return {
    primary: normalizeTicker(ticker),
    secondary: displayName,
  };
}
