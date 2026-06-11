export interface CategorizableNewsItem {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  url: string;
  source: string;
}

const BROKER_REPORT_PATTERNS = [
  // Korean — target price / ratings
  /목표가/i,
  /목표\s*주가/i,
  /목표가\s*[↑↓]/i,
  /목표가\s*[\d만억]/i,
  /목표가.{0,80}-[가-힣]{2,10}/i,
  /투자의견/i,
  /투자등급/i,
  /목표가\s*상향/i,
  /목표가\s*하향/i,
  /(?:목표가|투자의견|목표\s*주가).{0,40}상향\s*조정/i,
  /(?:목표가|투자의견|목표\s*주가).{0,40}하향\s*조정/i,
  /등급\s*(?:상향|하향)/i,
  /커버리지\s*(?:개시|시작|부여)/i,
  /비중\s*(?:확대|축소)/i,
  /투자의견\s*['"]?(?:매수|매도|중립|비중확대|비중축소)/i,

  // English — price targets
  /price\s*target/i,
  /target\s*price/i,
  /price\s*target\s*(?:to|of|at)\s*\$/i,
  /\bPT\s*(?:to|of)\s*\$/i,

  // English — upgrades / downgrades (avoid legal/political "upgrade charges")
  /\bupgrades?\s+(?:\w+(?:\s+\([^)]+\))?\s+)*(?:to\s+)?(?:buy|sell|hold|neutral|outperform|underperform|overweight|underweight)\b/i,
  /\bdowngrades?\s+(?:\w+(?:\s+\([^)]+\))?\s+)*(?:to\s+)?(?:buy|sell|hold|neutral|outperform|underperform|overweight|underweight)\b/i,
  /\bupgrades?\s+[A-Z][A-Za-z0-9.&'-]{1,50}/,
  /\bdowngrades?\s+[A-Z][A-Za-z0-9.&'-]{1,50}/,
  /\bupgraded\s+to\b/i,
  /\bdowngraded\s+to\b/i,
  /\bdouble\s+upgrades?\b/i,
  /\bdouble\s+downgrades?\b/i,

  // English — target / rating changes
  /raises?\s+(?:its\s+)?(?:price\s+)?target/i,
  /cuts?\s+(?:its\s+)?(?:price\s+)?target/i,
  /lowers?\s+(?:its\s+)?(?:price\s+)?target/i,
  /lifts?\s+(?:its\s+)?(?:price\s+)?target/i,
  /raises?\s+(?:its\s+)?rating/i,
  /cuts?\s+(?:its\s+)?rating/i,
  /lowers?\s+(?:its\s+)?rating/i,
  /lifts?\s+(?:its\s+)?rating/i,
  /raises?\s+.{0,100}\b(?:target|rating|outlook)\b/i,
  /cuts?\s+.{0,100}\b(?:target|rating|outlook)\b/i,
  /cuts?\s+.{0,120}\b(?:overweight|underweight|outperform|underperform|market-weight|equal-weight)\b/i,

  // English — coverage / ratings
  /initiates?\s+(?:coverage|at)/i,
  /initiates?\s+.{0,40}\s+at\s+(?:buy|sell|hold|neutral|outperform)/i,
  /\breiterates?\b/i,
  /\bmaintains?\s+(?:a\s+)?(?:buy|sell|hold|neutral|outperform|underperform|overweight|underweight)\b/i,
  /\bstarts?\s+.{0,40}\s+at\s+(?:buy|sell|hold|neutral|outperform)/i,
  /\boverweight\b/i,
  /\bunderweight\b/i,
  /\bOutperform\b/,
  /\bUnderperform\b/,
  /\boutperform\s+rating/i,
  /\bunderperform\s+rating/i,
  /\bmarket-weight\b/i,
  /\bequal-weight\b/i,
  /analyst\s+rating/i,
  /brokerage\s+rating/i,

  // English — major broker + action
  /\b(?:Goldman Sachs|JPMorgan|Jefferies|UBS|BofA|Morgan Stanley|Barclays|Citi|Wells Fargo|Bank of America)\s+(?:Upgrades?|Downgrades?|Cuts|Raises|Lifts|Lowers)\b/i,
];

const BROKER_REPORT_EXCLUSIONS = [
  /전환가액/i,
  /전환사채/i,
  /기준금리/i,
  /금리\s*(?:인상|인하|동결)/i,
  /shares?\s+outperform/i,
  /stocks?\s+outperform/i,
  /\boutperform(?:ed|ing|s)?\s+(?:the\s+)?(?:down\s+)?market/i,
];

export const MAX_GENERAL_NEWS = 24;
export const MAX_BROKER_REPORTS = 12;

function stripHtml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBrokerText(...parts: Array<string | undefined>): string {
  return parts
    .map((part) => stripHtml(part ?? ""))
    .filter(Boolean)
    .join(" ")
    .trim();
}

function hasStrongBrokerSignal(text: string): boolean {
  return /목표가|투자의견|price\s*target|upgrade|downgrade|analyst\s+rating|brokerage\s+rating/i.test(
    text
  );
}

export function isBrokerReportText(...parts: Array<string | undefined>): boolean {
  const normalized = normalizeBrokerText(...parts);
  if (!normalized) return false;

  if (
    BROKER_REPORT_EXCLUSIONS.some((pattern) => pattern.test(normalized)) &&
    !hasStrongBrokerSignal(normalized)
  ) {
    return false;
  }

  return BROKER_REPORT_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** @deprecated Use isBrokerReportText(title, description) */
export function isBrokerReportHeadline(title: string): boolean {
  return isBrokerReportText(title);
}

export function isBrokerReportItem(item: {
  title: string;
  description?: string;
}): boolean {
  return isBrokerReportText(item.title, item.description);
}

export function categorizeMarketNews<T extends CategorizableNewsItem>(items: T[]): {
  news: T[];
  brokerReports: T[];
} {
  const brokerReports: T[] = [];
  const news: T[] = [];

  for (const item of items) {
    if (isBrokerReportItem(item)) {
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
