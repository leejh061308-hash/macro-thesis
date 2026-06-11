import { NextRequest, NextResponse } from "next/server";
import { cacheSummary, getCachedSummary } from "@/lib/db";
import { createTitleHash } from "@/lib/hash";
import { isLikelyEnglish } from "@/lib/korean";
import { getApiKey, getOpenAIClient } from "@/lib/openai";
import {
  buildNewsSummaryPrompt,
  buildNewsSummaryRetryPrompt,
  NEWS_SUMMARY_PROMPT_VERSION,
  NEWS_SUMMARY_SYSTEM_PROMPT,
} from "@/lib/prompts/news";

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
  retry = false
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.startsWith("sk-")) return null;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: NEWS_SUMMARY_SYSTEM_PROMPT },
          {
            role: "user",
            content: retry
              ? buildNewsSummaryRetryPrompt(title, source)
              : buildNewsSummaryPrompt(title, source),
          },
        ],
        temperature: 0.3,
        max_tokens: 280,
      },
      { timeout: 12_000 }
    );
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function summarizeWithKoreanCheck(
  title: string,
  source: string
): Promise<string | null> {
  let summary = await summarizeOne(title, source);
  if (summary && isLikelyEnglish(summary)) {
    summary = await summarizeOne(title, source, true);
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
      if (cached && !isLikelyEnglish(cached)) {
        results[item.id] = cached;
        continue;
      }

      const summary = await summarizeWithKoreanCheck(item.title, item.source);
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
