export const MARKET_IMPACT_DELIMITER = "\n\n<!--MACROLENS_MARKET-->\n\n";

export interface NewsSummaryParts {
  summary: string;
  marketImpact: string;
}

export function serializeNewsSummary(parts: NewsSummaryParts): string {
  return `${parts.summary.trim()}${MARKET_IMPACT_DELIMITER}${parts.marketImpact.trim()}`;
}

export function parseNewsSummary(cached: string): NewsSummaryParts {
  const index = cached.indexOf(MARKET_IMPACT_DELIMITER);
  if (index === -1) {
    return { summary: cached, marketImpact: "" };
  }

  return {
    summary: cached.slice(0, index).trim(),
    marketImpact: cached.slice(index + MARKET_IMPACT_DELIMITER.length).trim(),
  };
}
