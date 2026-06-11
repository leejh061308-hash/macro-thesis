import { NextRequest, NextResponse } from "next/server";
import { buildStoredSummary } from "@/lib/main-news";
import {
  listNewsPendingAnalysis,
  parseSummary,
  updateNewsSummary,
} from "@/lib/news-db";
import { generateOfficialAnalysis } from "@/lib/official-news-ai";
import { isPostgresConfigured } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isPostgresConfigured()) {
      return NextResponse.json(
        { error: "PostgreSQL이 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedIds = Array.isArray(body.ids)
      ? body.ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isFinite(id))
      : null;

    const pending = (await listNewsPendingAnalysis()).filter((row) =>
      requestedIds ? requestedIds.includes(row.id) : true
    );

    const results: Record<number, string> = {};

    for (const row of pending.slice(0, 3)) {
      const { body: summaryBody } = parseSummary(row.summary);
      const analysis = await generateOfficialAnalysis(row.title, summaryBody);

      if (analysis) {
        const storedSummary = buildStoredSummary(summaryBody, analysis);
        await updateNewsSummary(row.id, storedSummary);
        results[row.id] = analysis;
      }
    }

    return NextResponse.json({ analyses: results });
  } catch (error) {
    console.error("Main news analyze error:", error);
    return NextResponse.json(
      { error: "AI 분석 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
