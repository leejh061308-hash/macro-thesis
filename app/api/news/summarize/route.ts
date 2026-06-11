import { NextRequest, NextResponse } from "next/server";
import { cacheSummary, getCachedSummary } from "@/lib/db";
import { createTitleHash } from "@/lib/hash";
import { isLikelyEnglish } from "@/lib/korean";
import { getApiKey, getOpenAIClient } from "@/lib/openai";
import {
  buildNewsSummaryAntiCopyPrompt,
  buildNewsSummaryPrompt,
  buildNewsSummaryRetryPrompt,
  NEWS_SUMMARY_ANTI_COPY_RETRY_PROMPT,
  NEWS_SUMMARY_PROMPT_VERSION,
  NEWS_SUMMARY_SYSTEM_PROMPT,
} from "@/lib/prompts/news";
import { isWeakHeadlineSummary } from "@/lib/summary-guard";

export const dynamic = "force-dynamic";

const MAX_BATCH = 8;
const CONCURRENCY = 3;

interface SummarizeItem {
  id: string;
  title: string;
  source: string;
}

function newsTitleHash(title: string): string {
  return createTitleHash(`${NEWS_SUMMARY_PROMPT_VERSION}:${title}`);
}

async function summarizeOne(
  title: string,
  source: string,
  options?: { retryKorean?: boolean; retryAntiCopy?: boolean }
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.startsWith("sk-")) return null;

  const userContent = options?.retryAntiCopy
    ? buildNewsSummaryAntiCopyPrompt(title, source)
    : options?.retryKorean
      ? buildNewsSummaryRetryPrompt(title, source)
      : buildNewsSummaryPrompt(title, source);

  const systemContent = options?.retryAntiCopy
    ? `${NEWS_SUMMARY_SYSTEM_PROMPT}\n\n${NEWS_SUMMARY_ANTI_COPY_RETRY_PROMPT}`
    : NEWS_SUMMARY_SYSTEM_PROMPT;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
        temperature: options?.retryAntiCopy ? 0.5 : 0.4,
        max_tokens: 280,
      },
      { timeout: 12_000 }
    );
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function summarizeWithQualityChecks(
  title: string,
  source: string
): Promise<string | null> {
  let summary = await summarizeOne(title, source);

  if (summary && isLikelyEnglish(summary)) {
    summary = await summarizeOne(title, source, { retryKorean: true });
  }

  if (summary && isWeakHeadlineSummary(summary)) {
    summary = await summarizeOne(title, source, { retryAntiCopy: true });
  }

  if (summary && isLikelyEnglish(summary)) {
    return null;
  }

  return summary;
}

async function runWithConcurrency(
  items: SummarizeItem[],
  limit: number
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const titleHash = newsTitleHash(item.title);
      const cached = getCachedSummary(item.id, titleHash);
      if (cached && !isLikelyEnglish(cached) && !isWeakHeadlineSummary(cached)) {
        results[item.id] = cached;
        continue;
      }

      const summary = await summarizeWithQualityChecks(item.title, item.source);
      const text = summary ?? "AI 요약을 생성하지 못했습니다.";
      cacheSummary(item.id, titleHash, text);
      results[item.id] = text;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: SummarizeItem[] = Array.isArray(body.items)
      ? body.items.slice(0, MAX_BATCH)
      : [];

    if (items.length === 0) {
      return NextResponse.json({ summaries: {} });
    }

    const summaries = await runWithConcurrency(items, CONCURRENCY);
    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("News summarize error:", error);
    return NextResponse.json(
      { error: "요약 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
