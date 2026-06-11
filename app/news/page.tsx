"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AiDisclaimer from "@/components/layout/AiDisclaimer";
import NewsCard from "@/components/news/NewsCard";
import OfficialNewsSection from "@/components/news/OfficialNewsSection";
import RefreshStatus from "@/components/stocks/RefreshStatus";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { NEWS_REFRESH_INTERVAL } from "@/lib/constants";
import type { NewsItem } from "@/lib/types";

const FETCH_TIMEOUT = 30_000;
const SUMMARIZE_BATCH = 8;
const SUMMARIZE_PARALLEL = 2;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = FETCH_TIMEOUT
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function mergeNewsItems(prev: NewsItem[], incoming: NewsItem[]): NewsItem[] {
  const prevById = new Map(prev.map((item) => [item.id, item]));

  return incoming.map((item) => {
    const existing = prevById.get(item.id);
    if (!existing) return item;

    const summary = item.summary || existing.summary;
    const marketImpact = item.marketImpact || existing.marketImpact;
    return {
      ...item,
      summary,
      marketImpact,
      summaryPending: !summary,
    };
  });
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summarizingRef = useRef(false);

  const loadSummaries = useCallback(async (items: NewsItem[]) => {
    const pending = items.filter((n) => n.summaryPending && !n.summary);
    if (pending.length === 0 || summarizingRef.current) return;

    summarizingRef.current = true;
    setIsSummarizing(true);

    try {
      const batches: NewsItem[][] = [];
      for (let i = 0; i < pending.length; i += SUMMARIZE_BATCH) {
        batches.push(pending.slice(i, i + SUMMARIZE_BATCH));
      }

      for (let i = 0; i < batches.length; i += SUMMARIZE_PARALLEL) {
        const chunk = batches.slice(i, i + SUMMARIZE_PARALLEL);
        const results = await Promise.all(
          chunk.map(async (batch) => {
            const res = await fetchWithTimeout("/api/news/summarize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: batch.map((n) => ({
                  id: n.id,
                  title: n.title,
                  source: n.source,
                })),
              }),
            });
            if (!res.ok) return {} as Record<string, { summary: string; marketImpact: string }>;
            const data = await res.json();
            return (data.summaries ?? {}) as Record<
              string,
              { summary: string; marketImpact: string }
            >;
          })
        );

        const merged = Object.assign({}, ...results);
        if (Object.keys(merged).length === 0) continue;

        setNews((prev) =>
          prev.map((item) =>
            merged[item.id]
              ? {
                  ...item,
                  summary: merged[item.id].summary,
                  marketImpact: merged[item.id].marketImpact,
                  summaryPending: false,
                }
              : item
          )
        );
      }
    } catch {
      // 요약 실패해도 뉴스 목록은 유지
    } finally {
      summarizingRef.current = false;
      setIsSummarizing(false);
    }
  }, []);

  const loadNews = useCallback(
    async (options?: { silent?: boolean; fresh?: boolean }) => {
      const silent = options?.silent ?? false;
      const fresh = options?.fresh ?? false;

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const url = fresh ? "/api/news?fresh=1" : "/api/news";
        const res = await fetchWithTimeout(url, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "뉴스를 불러오지 못했습니다.");
        }

        const items: NewsItem[] = data.news ?? [];
        setNews((prev) => (silent ? mergeNewsItems(prev, items) : items));
        setLastUpdated(new Date());
        if (!silent) setError(null);

        loadSummaries(items);
      } catch (err) {
        if (!silent) {
          setNews([]);
          setError(
            err instanceof Error && err.name === "AbortError"
              ? "뉴스 로딩 시간이 초과되었습니다. 새로고침해 주세요."
              : err instanceof Error
                ? err.message
                : "뉴스를 불러오지 못했습니다."
          );
        }
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [loadSummaries]
  );

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const pendingCount = news.filter(
    (item) => item.summaryPending && !item.summary
  ).length;

  useEffect(() => {
    if (pendingCount > 0 && !isLoading && !summarizingRef.current) {
      loadSummaries(news);
    }
  }, [pendingCount, news, isLoading, loadSummaries]);

  useAutoRefresh(
    () => loadNews({ silent: true }),
    NEWS_REFRESH_INTERVAL,
    !isLoading && !error
  );

  return (
    <div className="space-y-8">
      <AiDisclaimer />
      <OfficialNewsSection />

      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">정치·경제 뉴스</h2>
          <p className="text-[11px] text-gray-500">
            정치·경제·시장 헤드라인 · AI 요약 · 원문 링크 제공
          </p>
          {isLoading ? (
            <p className="mt-1 text-xs text-neutral">뉴스 불러오는 중...</p>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <RefreshStatus
                lastUpdated={lastUpdated}
                isRefreshing={isRefreshing}
                intervalSec={NEWS_REFRESH_INTERVAL / 1000}
              />
              {isSummarizing && (
                <span className="text-xs text-gray-400">· 요약 생성 중...</span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => loadNews({ fresh: true })}
          disabled={isLoading}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
        >
          {isLoading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-surface-border bg-surface-card"
            />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-bearish/30 bg-bearish/10 px-4 py-3 text-sm text-bearish">
          {error}
          <button
            type="button"
            onClick={() => loadNews({ fresh: true })}
            className="mt-2 block text-xs underline hover:text-white"
          >
            지금 다시 시도
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
