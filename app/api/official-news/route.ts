import { NextRequest, NextResponse } from "next/server";
import {
  getAdminKeyFromRequest,
  isAdminConfigured,
  verifyAdminKey,
} from "@/lib/admin";
import { buildStoredSummary, toMainNewsItem } from "@/lib/main-news";
import {
  createNews,
  deleteNews,
  getNewsById,
  listNews,
  parseSummary,
  updateNews,
} from "@/lib/news-db";
import { generateOfficialAnalysis } from "@/lib/official-news-ai";
import { isPostgresConfigured } from "@/lib/postgres";

export const dynamic = "force-dynamic";

function parseNewsId(request: NextRequest, body: Record<string, unknown>): number {
  const paramId = request.nextUrl.searchParams.get("id");
  const rawId =
    typeof body.id === "number"
      ? body.id
      : typeof body.id === "string"
        ? Number(body.id)
        : paramId
          ? Number(paramId)
          : NaN;

  return rawId;
}

function requireDatabase() {
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      {
        error:
          "PostgreSQL이 설정되지 않았습니다. Railway에서 Postgres를 추가하고 DATABASE_URL을 설정해주세요.",
      },
      { status: 503 }
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const dbError = requireDatabase();
    if (dbError) return dbError;

    const adminKey = getAdminKeyFromRequest(request);
    const rows = await listNews();

    return NextResponse.json({
      posts: rows.map(toMainNewsItem),
      canWrite: verifyAdminKey(adminKey),
    });
  } catch (error) {
    console.error("Main news GET error:", error);
    return NextResponse.json(
      { error: "메인 뉴스를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbError = requireDatabase();
    if (dbError) return dbError;

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
    const summary =
      typeof body.summary === "string" ? body.summary.trim() : "";
    const sourceUrl =
      typeof body.sourceUrl === "string" && body.sourceUrl.trim()
        ? body.sourceUrl.trim()
        : typeof body.source_url === "string" && body.source_url.trim()
          ? body.source_url.trim()
          : null;
    const publishedAt =
      typeof body.publishedAt === "string" && body.publishedAt.trim()
        ? body.publishedAt.trim()
        : typeof body.published_at === "string" && body.published_at.trim()
          ? body.published_at.trim()
          : null;

    if (title.length < 2) {
      return NextResponse.json(
        { error: "제목을 2자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    if (summary.length < 10) {
      return NextResponse.json(
        { error: "요약을 10자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const aiAnalysis = await generateOfficialAnalysis(title, summary);
    const row = await createNews({
      title,
      summary: buildStoredSummary(summary, aiAnalysis),
      sourceUrl,
      publishedAt,
    });

    return NextResponse.json({ post: toMainNewsItem(row) }, { status: 201 });
  } catch (error) {
    console.error("Main news POST error:", error);
    return NextResponse.json(
      { error: "메인 뉴스 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const dbError = requireDatabase();
    if (dbError) return dbError;

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
    const id = parseNewsId(request, body);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "유효하지 않은 뉴스 ID입니다." },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : undefined;
    const summary =
      typeof body.summary === "string" ? body.summary.trim() : undefined;
    const sourceUrl =
      body.sourceUrl === null
        ? null
        : typeof body.sourceUrl === "string"
          ? body.sourceUrl.trim() || null
          : typeof body.source_url === "string"
            ? body.source_url.trim() || null
            : undefined;
    const publishedAt =
      typeof body.publishedAt === "string" && body.publishedAt.trim()
        ? body.publishedAt.trim()
        : typeof body.published_at === "string" && body.published_at.trim()
          ? body.published_at.trim()
          : undefined;

    if (title !== undefined && title.length < 2) {
      return NextResponse.json(
        { error: "제목을 2자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    if (summary !== undefined && summary.length < 10) {
      return NextResponse.json(
        { error: "요약을 10자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    let storedSummary = summary;
    if (summary !== undefined) {
      const existing = await getNewsById(id);
      if (!existing) {
        return NextResponse.json(
          { error: "수정할 메인 뉴스를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      const { aiAnalysis } = parseSummary(existing.summary);
      storedSummary = buildStoredSummary(summary, aiAnalysis);
    }

    const row = await updateNews(id, {
      title,
      summary: storedSummary,
      sourceUrl,
      publishedAt,
    });

    if (!row) {
      return NextResponse.json(
        { error: "수정할 메인 뉴스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ post: toMainNewsItem(row) });
  } catch (error) {
    console.error("Main news PUT error:", error);
    return NextResponse.json(
      { error: "메인 뉴스 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const dbError = requireDatabase();
    if (dbError) return dbError;

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

    const body = await request.json().catch(() => ({}));
    const id = parseNewsId(request, body);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "유효하지 않은 뉴스 ID입니다." },
        { status: 400 }
      );
    }

    const deleted = await deleteNews(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "삭제할 메인 뉴스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Main news DELETE error:", error);
    return NextResponse.json(
      { error: "메인 뉴스 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
