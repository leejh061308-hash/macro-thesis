import { NextRequest, NextResponse } from "next/server";
import {
  getApiKey,
  getOpenAIClient,
  mapOpenAIError,
  validateApiKey,
} from "@/lib/openai";
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisPrompt,
} from "@/lib/prompts/analysis";
import { fetchQuote } from "@/lib/yahoo";
import type { StockAnalysis } from "@/lib/types";

function parseAnalysis(
  raw: unknown,
  ticker: string,
  name: string,
  userOpinion?: string
): StockAnalysis {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid analysis response");
  }

  const data = raw as Record<string, unknown>;

  const userOpinionReview =
    typeof data.userOpinionReview === "string"
      ? data.userOpinionReview.trim()
      : "";

  return {
    ticker,
    name,
    companySummary:
      typeof data.companySummary === "string" ? data.companySummary : "",
    userOpinion: userOpinion?.trim() || undefined,
    userOpinionReview: userOpinionReview || undefined,
    investmentPoints: Array.isArray(data.investmentPoints)
      ? data.investmentPoints.filter((p): p is string => typeof p === "string")
      : [],
    risks: Array.isArray(data.risks)
      ? data.risks.filter((r): r is string => typeof r === "string")
      : [],
    macroImpact: typeof data.macroImpact === "string" ? data.macroImpact : "",
    keyIndicators: Array.isArray(data.keyIndicators)
      ? data.keyIndicators.filter((i): i is string => typeof i === "string")
      : [],
    overallOpinion:
      typeof data.overallOpinion === "string" ? data.overallOpinion : "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    const keyError = validateApiKey(apiKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 500 });
    }

    const body = await request.json();
    const ticker = body.ticker?.trim().toUpperCase();
    const investmentOpinion =
      typeof body.investmentOpinion === "string"
        ? body.investmentOpinion.trim()
        : "";

    if (!ticker) {
      return NextResponse.json(
        { error: "티커를 선택해주세요." },
        { status: 400 }
      );
    }

    const quote = await fetchQuote(ticker);
    const name = quote?.name ?? ticker;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildAnalysisPrompt(ticker, name, investmentOpinion),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      },
      { timeout: 45000 }
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI 응답을 받지 못했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);
    const analysis = parseAnalysis(
      parsed,
      ticker,
      name,
      investmentOpinion
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    const message =
      error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.";
    const apiKey = getApiKey();

    return NextResponse.json(
      { error: mapOpenAIError(message, apiKey) },
      { status: 500 }
    );
  }
}
