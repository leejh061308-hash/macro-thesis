import { NextRequest, NextResponse } from "next/server";
import { searchTickers } from "@/lib/yahoo";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const results = await searchTickers(q);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "검색에 실패했습니다." },
      { status: 500 }
    );
  }
}
