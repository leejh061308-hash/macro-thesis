import { NextRequest, NextResponse } from "next/server";
import { getStrategyResults, getStrategyResultsWithTiming } from "@/lib/quant/service";
import { isValidStrategyId } from "@/lib/quant/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidStrategyId(id)) {
    return NextResponse.json({ error: "Unknown strategy" }, { status: 404 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const quick = request.nextUrl.searchParams.get("quick") === "1";
  const results = quick
    ? await getStrategyResults(id, limit)
    : await getStrategyResultsWithTiming(id, limit);

  return NextResponse.json({ strategyId: id, results });
}
