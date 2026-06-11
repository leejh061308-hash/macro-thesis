import { getApiKey, getOpenAIClient } from "@/lib/openai";
import {
  buildOfficialNewsPrompt,
  OFFICIAL_NEWS_SYSTEM_PROMPT,
} from "@/lib/prompts/official-news";

export async function generateOfficialAnalysis(
  title: string,
  content: string,
  eventType?: string
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.startsWith("sk-")) return null;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: OFFICIAL_NEWS_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildOfficialNewsPrompt(title, content, eventType),
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      },
      { timeout: 20_000 }
    );

    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
