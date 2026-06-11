import type { SearchResult } from "@/lib/types";

interface KoreanStockAlias {
  ticker: string;
  name: string;
  aliases: string[];
  exchange: "KOSPI" | "KOSDAQ";
}

const KOREAN_STOCKS: KoreanStockAlias[] = [
  {
    ticker: "005930.KS",
    name: "삼성전자",
    aliases: ["삼성전자", "삼전"],
    exchange: "KOSPI",
  },
  {
    ticker: "000660.KS",
    name: "SK하이닉스",
    aliases: ["SK하이닉스", "하이닉스"],
    exchange: "KOSPI",
  },
  {
    ticker: "035420.KS",
    name: "NAVER",
    aliases: ["네이버", "naver"],
    exchange: "KOSPI",
  },
  {
    ticker: "005380.KS",
    name: "현대차",
    aliases: ["현대차", "현대자동차"],
    exchange: "KOSPI",
  },
  {
    ticker: "000270.KS",
    name: "기아",
    aliases: ["기아", "기아차"],
    exchange: "KOSPI",
  },
  {
    ticker: "035720.KS",
    name: "카카오",
    aliases: ["카카오"],
    exchange: "KOSPI",
  },
  {
    ticker: "051910.KS",
    name: "LG화학",
    aliases: ["LG화학", "엘지화학"],
    exchange: "KOSPI",
  },
  {
    ticker: "006400.KS",
    name: "삼성SDI",
    aliases: ["삼성SDI", "삼성에스디아이"],
    exchange: "KOSPI",
  },
  {
    ticker: "373220.KS",
    name: "LG에너지솔루션",
    aliases: ["LG에너지솔루션", "엘지에너지솔루션", "LG엔솔"],
    exchange: "KOSPI",
  },
  {
    ticker: "207940.KS",
    name: "삼성바이오로직스",
    aliases: ["삼성바이오로직스", "삼바"],
    exchange: "KOSPI",
  },
  {
    ticker: "028260.KS",
    name: "삼성물산",
    aliases: ["삼성물산"],
    exchange: "KOSPI",
  },
  {
    ticker: "012330.KS",
    name: "현대모비스",
    aliases: ["현대모비스", "모비스"],
    exchange: "KOSPI",
  },
  {
    ticker: "066570.KS",
    name: "LG전자",
    aliases: ["LG전자", "엘지전자"],
    exchange: "KOSPI",
  },
  {
    ticker: "003550.KS",
    name: "LG",
    aliases: ["LG", "엘지"],
    exchange: "KOSPI",
  },
  {
    ticker: "034730.KS",
    name: "SK",
    aliases: ["SK", "에스케이"],
    exchange: "KOSPI",
  },
  {
    ticker: "105560.KS",
    name: "KB금융",
    aliases: ["KB금융", "국민은행"],
    exchange: "KOSPI",
  },
  {
    ticker: "055550.KS",
    name: "신한지주",
    aliases: ["신한지주", "신한금융"],
    exchange: "KOSPI",
  },
  {
    ticker: "015760.KS",
    name: "한국전력",
    aliases: ["한국전력", "한전"],
    exchange: "KOSPI",
  },
  {
    ticker: "003670.KS",
    name: "포스코퓨처엠",
    aliases: ["포스코퓨처엠", "포스코화학"],
    exchange: "KOSPI",
  },
  {
    ticker: "086520.KQ",
    name: "에코프로",
    aliases: ["에코프로"],
    exchange: "KOSDAQ",
  },
  {
    ticker: "247540.KQ",
    name: "에코프로비엠",
    aliases: ["에코프로비엠", "에코프로BM"],
    exchange: "KOSDAQ",
  },
  {
    ticker: "196170.KQ",
    name: "알테오젠",
    aliases: ["알테오젠"],
    exchange: "KOSDAQ",
  },
  {
    ticker: "263750.KQ",
    name: "펄어비스",
    aliases: ["펄어비스"],
    exchange: "KOSDAQ",
  },
  {
    ticker: "293490.KQ",
    name: "카카오게임즈",
    aliases: ["카카오게임즈"],
    exchange: "KOSDAQ",
  },
];

const KOREAN_STOCK_NAME_BY_TICKER = Object.fromEntries(
  KOREAN_STOCKS.map((entry) => [entry.ticker, entry.name])
);

export function getKoreanStockCanonicalName(ticker: string): string | null {
  return KOREAN_STOCK_NAME_BY_TICKER[ticker] ?? null;
}

function normalizeAliasQuery(query: string): string {
  return query.trim().toLowerCase();
}

function aliasScore(entry: KoreanStockAlias, query: string): number {
  const normalized = normalizeAliasQuery(query);
  if (!normalized) return 0;

  if (entry.name.toLowerCase() === normalized) return 100;
  if (entry.ticker.toLowerCase() === normalized) return 100;

  for (const alias of entry.aliases) {
    const aliasNorm = alias.toLowerCase();
    if (aliasNorm === normalized) return 90;
    if (aliasNorm.startsWith(normalized) || normalized.startsWith(aliasNorm)) {
      return 70;
    }
    if (aliasNorm.includes(normalized) || normalized.includes(aliasNorm)) {
      return 50;
    }
  }

  if (entry.name.toLowerCase().includes(normalized)) return 40;
  return 0;
}

export function searchKoreanStockAliases(query: string): SearchResult[] {
  if (!/[\u3131-\uD79D]/i.test(query)) return [];

  return KOREAN_STOCKS
    .map((entry) => ({ entry, score: aliasScore(entry, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ entry }) => ({
      ticker: entry.ticker,
      name: entry.name,
      exchange: entry.exchange,
    }));
}
