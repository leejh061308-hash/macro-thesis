import { NextRequest, NextResponse } from "next/server";
import { getRanking } from "@/lib/quant/service";
import type { StrategyId } from "@/lib/quant/types";

const VALID: StrategyId[] = [
  "value",
  "growth",
  "dividend",
  "quality",
  "low-volatility",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!VALID.includes(id as StrategyId)) {
    return NextResponse.json({ error: "Unknown strategy" }, { status: 404 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const results = await getRanking(id as StrategyId, limit);

  return NextResponse.json({ strategyId: id, results });
}
