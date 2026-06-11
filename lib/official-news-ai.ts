import { getApiKey, getOpenAIClient } from "@/lib/openai";
import {
  buildOfficialNewsAntiCopyPrompt,
  buildOfficialNewsPrompt,
  OFFICIAL_NEWS_ANTI_COPY_RETRY_PROMPT,
  OFFICIAL_NEWS_SYSTEM_PROMPT,
} from "@/lib/prompts/official-news";
import { isTooSimilarToSource } from "@/lib/summary-guard";

async function generateAnalysis(
  title: string,
  content: string,
  eventType: string | undefined,
  antiCopy: boolean
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.startsWith("sk-")) return null;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: antiCopy
              ? `${OFFICIAL_NEWS_SYSTEM_PROMPT}\n\n${OFFICIAL_NEWS_ANTI_COPY_RETRY_PROMPT}`
              : OFFICIAL_NEWS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: antiCopy
              ? buildOfficialNewsAntiCopyPrompt(title, content, eventType)
              : buildOfficialNewsPrompt(title, content, eventType),
          },
        ],
        temperature: antiCopy ? 0.55 : 0.5,
        max_tokens: 500,
      },
      { timeout: 20_000 }
    );

    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function generateOfficialAnalysis(
  title: string,
  content: string,
  eventType?: string
): Promise<string | null> {
  let analysis = await generateAnalysis(title, content, eventType, false);
  if (!analysis) return null;

  if (isTooSimilarToSource(content, analysis)) {
    const rewritten = await generateAnalysis(title, content, eventType, true);
    if (rewritten && !isTooSimilarToSource(content, rewritten)) {
      return rewritten;
    }
    if (rewritten) return rewritten;
  }

  return analysis;
}
