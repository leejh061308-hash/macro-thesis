export interface CategorizableNewsItem {
  id: string;
  title: string;
  publishedAt: string;
  url: string;
  source: string;
}

const BROKER_REPORT_PATTERNS = [
  /목표가/i,
  /목표\s*주가/i,
  /투자의견/i,
  /목표가\s*상향/i,
  /목표가\s*하향/i,
  /상향\s*조정/i,
  /하향\s*조정/i,
  /price\s*target/i,
  /target\s*price/i,
  /\bupgrades?\b/i,
  /\bdowngrades?\b/i,
  /raises?\s+(?:its\s+)?(?:price\s+)?target/i,
  /cuts?\s+(?:its\s+)?(?:price\s+)?target/i,
  /lowers?\s+(?:its\s+)?(?:price\s+)?target/i,
  /lifts?\s+(?:its\s+)?(?:price\s+)?target/i,
  /initiates?\s+(?:coverage|at)/i,
  /\breiterates?\b/i,
  /\boverweight\b/i,
  /\bunderweight\b/i,
  /\boutperform\b/i,
  /\bunderperform\b/i,
  /analyst\s+rating/i,
  /brokerage\s+rating/i,
];

export const MAX_GENERAL_NEWS = 24;
export const MAX_BROKER_REPORTS = 12;

export function isBrokerReportHeadline(title: string): boolean {
  const normalized = title.trim();
  if (!normalized) return false;
  return BROKER_REPORT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function categorizeMarketNews<T extends CategorizableNewsItem>(items: T[]): {
  news: T[];
  brokerReports: T[];
} {
  const brokerReports: T[] = [];
  const news: T[] = [];

  for (const item of items) {
    if (isBrokerReportHeadline(item.title)) {
      brokerReports.push(item);
    } else {
      news.push(item);
    }
  }

  return {
    news: news.slice(0, MAX_GENERAL_NEWS),
    brokerReports: brokerReports.slice(0, MAX_BROKER_REPORTS),
  };
}
