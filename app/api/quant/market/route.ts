import { NextRequest, NextResponse } from "next/server";
import { getMarketAnalytics } from "@/lib/quant/service";
import type { RotationWindow } from "@/lib/quant/market-analytics";
import type { UniverseId } from "@/lib/quant/types";

const ROTATION_WINDOWS: RotationWindow[] = ["1m", "3m", "6m", "1y"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rotation = (params.get("rotation") ?? "3m") as RotationWindow;
  const universeId = (params.get("universe") ?? "combined") as UniverseId;

  if (!ROTATION_WINDOWS.includes(rotation)) {
    return NextResponse.json({ error: "Invalid rotation window" }, { status: 400 });
  }

  try {
    const data = await getMarketAnalytics(rotation, universeId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[quant/market]", error);
    return NextResponse.json(
      { error: "시장 팩터 분석을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
