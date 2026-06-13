import { NextRequest, NextResponse } from "next/server";
import { getPortfolioFromPreset } from "@/lib/quant/service";
import { PORTFOLIO_PRESETS } from "@/lib/quant/market-analytics";
import type { UniverseId } from "@/lib/quant/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const presetId = params.get("preset") ?? "balanced";
  const universeId = (params.get("universe") ?? "combined") as UniverseId;
  const limit = Math.min(Number(params.get("limit") ?? 20), 50);

  const validIds = PORTFOLIO_PRESETS.map((p) => p.id);
  if (!validIds.includes(presetId as (typeof validIds)[number])) {
    return NextResponse.json({ error: "Unknown portfolio preset" }, { status: 400 });
  }

  try {
    const result = await getPortfolioFromPreset(
      presetId as (typeof validIds)[number],
      universeId,
      limit
    );
    if (!result) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[quant/portfolio]", error);
    return NextResponse.json(
      { error: "포트폴리오 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
