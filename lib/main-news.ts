import {
  composeSummary,
  parseSummary,
  type NewsRow,
} from "@/lib/news-db";
import type { MainNewsItem } from "@/lib/types";

export function toMainNewsItem(row: NewsRow): MainNewsItem {
  const { body, aiAnalysis } = parseSummary(row.summary);

  return {
    id: row.id,
    title: row.title,
    summary: body,
    sourceUrl: row.source_url,
    publishedAt: row.published_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    aiAnalysis,
    aiAnalysisPending: !aiAnalysis,
  };
}

export function buildStoredSummary(body: string, aiAnalysis?: string | null): string {
  return composeSummary(body, aiAnalysis);
}
