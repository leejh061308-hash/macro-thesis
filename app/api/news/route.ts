import { NextRequest, NextResponse } from "next/server";
import { getCachedSummary } from "@/lib/db";
import { createTitleHash } from "@/lib/hash";
import { parseNewsSummary } from "@/lib/news-summary";
import { NEWS_SUMMARY_PROMPT_VERSION } from "@/lib/prompts/news";
import { fetchMarketNews } from "@/lib/rss";
import type { NewsItem } from "@/lib/types";

function newsTitleHash(title: string): string {
  return createTitleHash(`${NEWS_SUMMARY_PROMPT_VERSION}:${title}`);
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const bypassCache = request.nextUrl.searchParams.get("fresh") === "1";
    const rawNews = await fetchMarketNews({ bypassCache });

    const news: NewsItem[] = rawNews.map((item) => {
      const titleHash = newsTitleHash(item.title);
      const cached = getCachedSummary(item.id, titleHash);
      const parsed = cached ? parseNewsSummary(cached) : null;
      const hasSummary = !!parsed?.summary;

      return {
        id: item.id,
        title: item.title,
        summary: parsed?.summary ?? "",
        marketImpact: parsed?.marketImpact ?? "",
        summaryPending: !hasSummary,
        publishedAt: item.publishedAt,
        url: item.url,
        source: item.source,
      };
    });

    return NextResponse.json(
      { news },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json(
      { error: "뉴스를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
