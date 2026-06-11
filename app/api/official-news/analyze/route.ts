import { NextRequest, NextResponse } from "next/server";
import {
  getOfficialNewsPendingAnalysis,
  updateOfficialNewsAnalysis,
} from "@/lib/db";
import { generateOfficialAnalysis } from "@/lib/official-news-ai";
import type { OfficialNewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedIds = Array.isArray(body.ids)
      ? body.ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isFinite(id))
      : null;

    const pending = getOfficialNewsPendingAnalysis().filter((row) =>
      requestedIds ? requestedIds.includes(row.id) : true
    );

    const results: Record<number, string> = {};

    for (const row of pending.slice(0, 3)) {
      const analysis = await generateOfficialAnalysis(
        row.title,
        row.content,
        row.eventType ?? undefined
      );

      if (analysis) {
        updateOfficialNewsAnalysis(row.id, analysis);
        results[row.id] = analysis;
      }
    }

    return NextResponse.json({ analyses: results });
  } catch (error) {
    console.error("Official news analyze error:", error);
    return NextResponse.json(
      { error: "AI 분석 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
