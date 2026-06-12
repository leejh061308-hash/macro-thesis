import { NextRequest, NextResponse } from "next/server";
import {
  getApiKey,
  getOpenAIClient,
  mapOpenAIError,
  validateApiKey,
} from "@/lib/openai";
import {
  BACKTEST_INTERPRET_SYSTEM,
  buildBacktestInterpretPrompt,
} from "@/lib/prompts/quant-backtest";
import type { BacktestStats, StrategyId } from "@/lib/quant/types";
import { isValidStrategyId } from "@/lib/quant/constants";

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    const keyError = validateApiKey(apiKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 503 });
    }

    const body = (await request.json()) as {
      strategyId?: StrategyId;
      strategyName?: string;
      periodLabel?: string;
      stats?: BacktestStats;
      selectionNote?: string;
    };

    if (
      !body.strategyId ||
      !isValidStrategyId(body.strategyId) ||
      !body.strategyName ||
      !body.periodLabel ||
      !body.stats
    ) {
      return NextResponse.json(
        { error: "백테스트 결과가 필요합니다." },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BACKTEST_INTERPRET_SYSTEM },
        {
          role: "user",
          content: buildBacktestInterpretPrompt(
            body.strategyId,
            body.strategyName,
            body.periodLabel,
            body.stats,
            body.selectionNote ?? ""
          ),
        },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "AI 해석을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(raw) as { interpretation?: string };
    return NextResponse.json({
      interpretation: parsed.interpretation ?? "",
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
