import { NextRequest, NextResponse } from "next/server";
import { getRanking } from "@/lib/quant/service";
import { isValidStrategyId } from "@/lib/quant/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidStrategyId(id)) {
    return NextResponse.json({ error: "Unknown strategy" }, { status: 404 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const results = await getRanking(id, limit);

  return NextResponse.json({ strategyId: id, results });
}
