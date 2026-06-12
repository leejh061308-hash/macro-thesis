import { NextResponse } from "next/server";
import { getStrategyEntryEnvironments } from "@/lib/timing/service";

export async function GET() {
  try {
    const environments = await getStrategyEntryEnvironments();
    return NextResponse.json({ environments });
  } catch (error) {
    console.error("[timing/strategy-environment]", error);
    return NextResponse.json(
      { error: "전략별 진입 환경을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
