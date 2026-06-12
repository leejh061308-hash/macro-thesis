import { NextRequest, NextResponse } from "next/server";
import {
  getApiKey,
  getOpenAIClient,
  mapOpenAIError,
  validateApiKey,
} from "@/lib/openai";
import {
  buildScreenerAiPrompt,
  normalizeAiScreenerRequest,
  SCREENER_AI_SYSTEM,
} from "@/lib/prompts/screener-ai";
import { runAdvancedScreener } from "@/lib/screener/service";
import type { ScreenerRequest } from "@/lib/screener/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim();
    if (!query) {
      return NextResponse.json({ error: "검색 문장을 입력해주세요." }, { status: 400 });
    }

    const apiKey = getApiKey();
    const keyError = validateApiKey(apiKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 503 });
    }

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCREENER_AI_SYSTEM },
        { role: "user", content: buildScreenerAiPrompt(query) },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "AI가 조건을 해석하지 못했습니다." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(raw) as Partial<ScreenerRequest>;
    const screenerRequest = normalizeAiScreenerRequest(parsed, query);
    const result = await runAdvancedScreener(screenerRequest);

    return NextResponse.json({
      ...result,
      interpretedRequest: screenerRequest,
      aiQuery: query,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: mapOpenAIError(message, getApiKey()) },
      { status: 500 }
    );
  }
}
