import { createArticleId } from "@/lib/hash";

export interface RawNewsItem {
  id: string;
  title: string;
  publishedAt: string;
  url: string;
  source: string;
}

/** 헤드라인·링크·발행시각만 사용 (기사 본문 미수집) */
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
] as const;

const USER_AGENT =
  "Mozilla/5.0 (compatible; MacroLens/1.0; Investment Research)";

const MAX_NEWS_POOL = 96;
const RSS_CACHE_MS = 120_000;

let newsCache: { data: RawNewsItem[]; fetchedAt: number } | null = null;

function extractTag(content: string, tag: string): string {
  const cdata = content.match(
    new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, "s")
  );
  if (cdata?.[1]) return cdata[1].trim();

  const plain = content.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
  return plain?.[1]?.trim() ?? "";
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

      if (!title || !link) return null;

      return {
        id: createArticleId(link),
        title,
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

async function fetchFreshNews(): Promise<RawNewsItem[]> {
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

  return dedupeAndSort(allItems).slice(0, MAX_NEWS_POOL);
}

export async function fetchMarketNews(options?: {
  bypassCache?: boolean;
}): Promise<RawNewsItem[]> {
  const now = Date.now();
  if (
    !options?.bypassCache &&
    newsCache &&
    now - newsCache.fetchedAt < RSS_CACHE_MS
  ) {
    return newsCache.data;
  }

  const data = await fetchFreshNews();
  newsCache = { data, fetchedAt: now };
  return data;
}
