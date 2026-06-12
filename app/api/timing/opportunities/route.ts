import { NextResponse } from "next/server";
import { getTodaysOpportunities } from "@/lib/timing/service";

export async function GET() {
  try {
    const opportunities = await getTodaysOpportunities(10);
    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error("[timing/opportunities]", error);
    return NextResponse.json(
      { error: "오늘의 기회를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
