import { NextRequest, NextResponse } from "next/server";
import { cacheSummary, getCachedSummary } from "@/lib/db";
import { createTitleHash } from "@/lib/hash";
import { isLikelyEnglish } from "@/lib/korean";
import {
  parseNewsSummary,
  serializeNewsSummary,
  type NewsSummaryParts,
} from "@/lib/news-summary";
import { getApiKey, getOpenAIClient } from "@/lib/openai";
import {
  buildNewsSummaryAntiCopyPrompt,
  buildNewsSummaryNaturalKoreanPrompt,
  buildNewsSummaryPrompt,
  buildNewsSummaryRetryPrompt,
  NEWS_SUMMARY_ANTI_COPY_RETRY_PROMPT,
  NEWS_SUMMARY_NATURAL_KOREAN_RETRY_PROMPT,
  NEWS_SUMMARY_PROMPT_VERSION,
  NEWS_SUMMARY_SYSTEM_PROMPT,
} from "@/lib/prompts/news";
import {
  isWeakNewsSummaryParts,
  looksLikeTranslationese,
} from "@/lib/summary-guard";

export const dynamic = "force-dynamic";

const MAX_BATCH = 8;
const CONCURRENCY = 3;

const FALLBACK_SUMMARY: NewsSummaryParts = {
  summary: "AI 요약을 생성하지 못했습니다.",
  marketImpact: "",
};

interface SummarizeItem {
  id: string;
  title: string;
  source: string;
}

function newsTitleHash(title: string): string {
  return createTitleHash(`${NEWS_SUMMARY_PROMPT_VERSION}:${title}`);
}

function parseSummaryJson(raw: string): NewsSummaryParts | null {
  try {
    const parsed = JSON.parse(raw) as {
      summary?: string;
      marketImpact?: string;
    };
    const summary = parsed.summary?.trim() ?? "";
    const marketImpact = parsed.marketImpact?.trim() ?? "";
    if (!summary) return null;
    return { summary, marketImpact };
  } catch {
    return null;
  }
}

async function summarizeOne(
  title: string,
  source: string,
  options?: {
    retryKorean?: boolean;
    retryAntiCopy?: boolean;
    retryNaturalKorean?: boolean;
  }
): Promise<NewsSummaryParts | null> {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.startsWith("sk-")) return null;

  const userContent = options?.retryNaturalKorean
    ? buildNewsSummaryNaturalKoreanPrompt(title, source)
    : options?.retryAntiCopy
      ? buildNewsSummaryAntiCopyPrompt(title, source)
      : options?.retryKorean
        ? buildNewsSummaryRetryPrompt(title, source)
        : buildNewsSummaryPrompt(title, source);

  const systemContent = options?.retryNaturalKorean
    ? `${NEWS_SUMMARY_SYSTEM_PROMPT}\n\n${NEWS_SUMMARY_NATURAL_KOREAN_RETRY_PROMPT}`
    : options?.retryAntiCopy
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
        response_format: { type: "json_object" },
        temperature:
          options?.retryNaturalKorean || options?.retryAntiCopy ? 0.55 : 0.4,
        max_tokens: 360,
      },
      { timeout: 12_000 }
    );

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    return parseSummaryJson(raw);
  } catch {
    return null;
  }
}

function isValidParts(parts: NewsSummaryParts): boolean {
  if (isLikelyEnglish(parts.summary) || isLikelyEnglish(parts.marketImpact)) {
    return false;
  }
  return !isWeakNewsSummaryParts(parts.summary, parts.marketImpact);
}

async function summarizeWithQualityChecks(
  title: string,
  source: string
): Promise<NewsSummaryParts | null> {
  let parts = await summarizeOne(title, source);

  if (parts && (isLikelyEnglish(parts.summary) || isLikelyEnglish(parts.marketImpact))) {
    parts = await summarizeOne(title, source, { retryKorean: true });
  }

  if (
    parts &&
    looksLikeTranslationese(parts.summary, parts.marketImpact)
  ) {
    parts = await summarizeOne(title, source, { retryNaturalKorean: true });
  }

  if (parts && !isValidParts(parts)) {
    parts = await summarizeOne(title, source, { retryAntiCopy: true });
  }

  if (
    parts &&
    looksLikeTranslationese(parts.summary, parts.marketImpact)
  ) {
    parts = await summarizeOne(title, source, { retryNaturalKorean: true });
  }

  if (!parts || !isValidParts(parts)) return null;
  return parts;
}

function loadCachedParts(
  articleId: string,
  title: string
): NewsSummaryParts | null {
  const cached = getCachedSummary(articleId, newsTitleHash(title));
  if (!cached) return null;

  const parts = parseNewsSummary(cached);
  if (!isValidParts(parts)) return null;
  return parts;
}

async function runWithConcurrency(
  items: SummarizeItem[],
  limit: number
): Promise<Record<string, NewsSummaryParts>> {
  const results: Record<string, NewsSummaryParts> = {};
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const cached = loadCachedParts(item.id, item.title);
      if (cached) {
        results[item.id] = cached;
        continue;
      }

      const parts =
        (await summarizeWithQualityChecks(item.title, item.source)) ??
        FALLBACK_SUMMARY;

      cacheSummary(
        item.id,
        newsTitleHash(item.title),
        serializeNewsSummary(parts)
      );
      results[item.id] = parts;
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
