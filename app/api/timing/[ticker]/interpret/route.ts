import { NextRequest, NextResponse } from "next/server";
import {
  getApiKey,
  getOpenAIClient,
  mapOpenAIError,
  validateApiKey,
} from "@/lib/openai";
import {
  TIMING_INTERPRET_SYSTEM,
  buildTimingInterpretPrompt,
} from "@/lib/prompts/timing";
import { getTimingScore } from "@/lib/timing/service";
import { normalizeTicker } from "@/lib/tickers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const apiKey = getApiKey();
    const keyError = validateApiKey(apiKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 503 });
    }

    const { ticker: raw } = await params;
    const ticker = normalizeTicker(decodeURIComponent(raw));
    const timing = await getTimingScore(ticker);

    if (!timing) {
      return NextResponse.json(
        { error: "진입 점수 데이터가 없습니다." },
        { status: 404 }
      );
    }

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TIMING_INTERPRET_SYSTEM },
        {
          role: "user",
          content: buildTimingInterpretPrompt(
            timing.name,
            timing.timingScore,
            timing.companyScore,
            timing.breakdown,
            timing.interpretation
          ),
        },
      ],
      temperature: 0.4,
      max_tokens: 350,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: "AI 해석을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(rawContent) as { interpretation?: string };
    return NextResponse.json({
      interpretation: parsed.interpretation ?? timing.interpretation,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: mapOpenAIError(message, getApiKey()) },
      { status: 500 }
    );
  }
}
