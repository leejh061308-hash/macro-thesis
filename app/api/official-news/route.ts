import { NextRequest, NextResponse } from "next/server";
import {
  getAdminKeyFromRequest,
  isAdminConfigured,
  verifyAdminKey,
} from "@/lib/admin";
import {
  createOfficialNews,
  deleteOfficialNews,
  getOfficialNews,
  type OfficialNewsRow,
} from "@/lib/db";
import {
  createOfficialContentHash,
  generateOfficialAnalysis,
} from "@/lib/official-news-ai";
import type { OfficialNewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function toOfficialNewsItem(row: OfficialNewsRow): OfficialNewsItem {
  const analysis = row.aiAnalysis?.trim() ?? "";
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    eventType: row.eventType ?? undefined,
    aiAnalysis: analysis,
    aiAnalysisPending: !analysis,
    publishedAt: row.createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const adminKey = getAdminKeyFromRequest(request);
    const rows = getOfficialNews();
    return NextResponse.json({
      posts: rows.map(toOfficialNewsItem),
      canWrite: verifyAdminKey(adminKey),
    });
  } catch (error) {
    console.error("Official news GET error:", error);
    return NextResponse.json(
      { error: "메인 뉴스를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "관리자 기능이 설정되지 않았습니다. .env.local에 ADMIN_SECRET을 추가해주세요.",
        },
        { status: 503 }
      );
    }

    const adminKey = getAdminKeyFromRequest(request);
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json(
        { error: "관리자 인증에 실패했습니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const eventType =
      typeof body.eventType === "string" && body.eventType.trim()
        ? body.eventType.trim()
        : null;

    if (title.length < 2) {
      return NextResponse.json(
        { error: "제목을 2자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    if (content.length < 10) {
      return NextResponse.json(
        { error: "내용을 10자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const contentHash = createOfficialContentHash(title, content);
    let aiAnalysis = await generateOfficialAnalysis(
      title,
      content,
      eventType ?? undefined
    );

    if (!aiAnalysis) {
      aiAnalysis = null;
    }

    const row = createOfficialNews(
      title,
      content,
      eventType,
      contentHash,
      aiAnalysis
    );

    return NextResponse.json(
      { post: toOfficialNewsItem(row) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Official news POST error:", error);
    return NextResponse.json(
      { error: "메인 뉴스 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "관리자 기능이 설정되지 않았습니다. .env.local에 ADMIN_SECRET을 추가해주세요.",
        },
        { status: 503 }
      );
    }

    const adminKey = getAdminKeyFromRequest(request);
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json(
        { error: "관리자 인증에 실패했습니다." },
        { status: 401 }
      );
    }

    const paramId = request.nextUrl.searchParams.get("id");
    const body = await request.json().catch(() => ({}));
    const rawId =
      typeof body.id === "number"
        ? body.id
        : typeof body.id === "string"
          ? Number(body.id)
          : paramId
            ? Number(paramId)
            : NaN;

    if (!Number.isInteger(rawId) || rawId <= 0) {
      return NextResponse.json(
        { error: "유효하지 않은 뉴스 ID입니다." },
        { status: 400 }
      );
    }

    const deleted = deleteOfficialNews(rawId);
    if (!deleted) {
      return NextResponse.json(
        { error: "삭제할 메인 뉴스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: rawId });
  } catch (error) {
    console.error("Official news DELETE error:", error);
    return NextResponse.json(
      { error: "메인 뉴스 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
