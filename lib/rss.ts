import { createArticleId } from "@/lib/hash";

export interface RawNewsItem {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  url: string;
  source: string;
}

/** 헤드라인·요약·링크·발행시각만 사용 (기사 본문 미수집) */
const RSS_FEEDS = [
  {
    source: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
  },
  {
    source: "The Guardian",
    url: "https://www.theguardian.com/politics/rss",
  },
  {
    source: "The Guardian",
    url: "https://www.theguardian.com/business/rss",
  },
  {
    source: "BBC",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    source: "BBC",
    url: "https://feeds.bbci.co.uk/news/politics/rss.xml",
  },
  {
    source: "BBC",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
  },
  {
    source: "CNBC",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
  },
  {
    source: "CNBC",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000113",
  },
  {
    source: "NPR",
    url: "https://feeds.npr.org/1014/rss.xml",
  },
  {
    source: "NPR",
    url: "https://feeds.npr.org/1007/rss.xml",
  },
  {
    source: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
  },
  {
    source: "MarketWatch",
    url: "https://www.marketwatch.com/rss/topstories",
  },
  {
    source: "한국경제",
    url: "https://www.hankyung.com/feed/finance",
  },
  {
    source: "이데일리",
    url: "http://rss.edaily.co.kr/stock_news.xml",
  },
  {
    source: "머니투데이",
    url: "http://rss.mt.co.kr/mt_news_stock.xml",
  },
  {
    source: "매일경제",
    url: "https://www.mk.co.kr/rss/50200011/",
  },
] as const;

const USER_AGENT =
  "Mozilla/5.0 (compatible; MacroLens/1.0; Investment Research)";

const MAX_NEWS_POOL = 160;
const BROKER_PRIORITY_SOURCES = new Set([
  "한국경제",
  "이데일리",
  "머니투데이",
  "매일경제",
]);
const BROKER_PRIORITY_PER_SOURCE = 25;
const RSS_CACHE_MS = 120_000;

interface NewsCache {
  pool: RawNewsItem[];
  all: RawNewsItem[];
  fetchedAt: number;
}

let newsCache: NewsCache | null = null;

function extractTag(content: string, tag: string): string {
  const cdata = content.match(
    new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, "s")
  );
  if (cdata?.[1]) return cdata[1].trim();

  const plain = content.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
  return plain?.[1]?.trim() ?? "";
}

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

function extractDescription(item: string): string {
  const description =
    extractTag(item, "description") ||
    extractTag(item, "content:encoded") ||
    extractTag(item, "summary");

  return stripHtml(description);
}

function parseRssItems(xml: string, source: string): RawNewsItem[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return items
    .map((item) => {
      const title = extractTag(item, "title").replace(/&apos;/g, "'");
      const link =
        extractTag(item, "link") ||
        extractTag(item, "guid") ||
        "";
      const pubDate = extractTag(item, "pubDate");
      const itemSource = extractTag(item, "source") || source;
      const description = extractDescription(item);

      if (!title || !link) return null;

      return {
        id: createArticleId(link),
        title,
        description,
        publishedAt: pubDate
          ? new Date(pubDate).toISOString()
          : new Date().toISOString(),
        url: link,
        source: itemSource,
      };
    })
    .filter((item): item is RawNewsItem => item !== null);
}

async function fetchFeed(
  feedUrl: string,
  source: string
): Promise<RawNewsItem[]> {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`${source} RSS failed: ${response.status}`);
  }

  const xml = await response.text();
  if (!xml.includes("<item") && !xml.includes("<entry")) {
    throw new Error(`${source} RSS returned non-feed content`);
  }

  return parseRssItems(xml, source);
}

function dedupeAndSort(items: RawNewsItem[]): RawNewsItem[] {
  const seen = new Set<string>();
  const unique: RawNewsItem[] = [];

  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
  }

  return unique.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function trimNewsPool(items: RawNewsItem[]): RawNewsItem[] {
  const sorted = dedupeAndSort(items);
  const priority: RawNewsItem[] = [];
  const priorityUrls = new Set<string>();

  for (const source of BROKER_PRIORITY_SOURCES) {
    for (const item of sorted.filter((entry) => entry.source === source)) {
      if (priorityUrls.has(item.url)) continue;
      if (
        priority.filter((entry) => entry.source === source).length >=
        BROKER_PRIORITY_PER_SOURCE
      ) {
        break;
      }
      priorityUrls.add(item.url);
      priority.push(item);
    }
  }

  const general = sorted
    .filter((item) => !priorityUrls.has(item.url))
    .slice(0, MAX_NEWS_POOL - priority.length);

  return dedupeAndSort([...priority, ...general]).slice(0, MAX_NEWS_POOL);
}

async function fetchFreshNews(): Promise<NewsCache> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchFeed(feed.url, feed.source))
  );

  const allItems: RawNewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  if (allItems.length === 0) {
    throw new Error("All RSS feeds failed");
  }

  const all = dedupeAndSort(allItems);
  return {
    pool: trimNewsPool(all),
    all,
    fetchedAt: Date.now(),
  };
}

async function getNewsCache(options?: {
  bypassCache?: boolean;
}): Promise<NewsCache> {
  const now = Date.now();
  if (
    !options?.bypassCache &&
    newsCache &&
    now - newsCache.fetchedAt < RSS_CACHE_MS
  ) {
    return newsCache;
  }

  newsCache = await fetchFreshNews();
  return newsCache;
}

/** UI·일반 뉴스용으로 다듬은 풀 */
export async function fetchMarketNews(options?: {
  bypassCache?: boolean;
}): Promise<RawNewsItem[]> {
  const cache = await getNewsCache(options);
  return cache.pool;
}

/** 증권사 리포트 분류용 전체 RSS 수집 결과 */
export async function fetchAllMarketNews(options?: {
  bypassCache?: boolean;
}): Promise<RawNewsItem[]> {
  const cache = await getNewsCache(options);
  return cache.all;
}
