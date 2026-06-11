import { getPool } from "@/lib/postgres";

export const AI_SUMMARY_DELIMITER = "\n\n<!--MACROLENS_AI-->\n\n";

export interface NewsRow {
  id: number;
  title: string;
  summary: string;
  source_url: string | null;
  published_at: Date;
  created_at: Date;
}

export interface CreateNewsInput {
  title: string;
  summary: string;
  sourceUrl?: string | null;
  publishedAt?: Date | string | null;
}

export interface UpdateNewsInput {
  title?: string;
  summary?: string;
  sourceUrl?: string | null;
  publishedAt?: Date | string | null;
}

let schemaReady: Promise<void> | null = null;

export function parseSummary(summary: string): {
  body: string;
  aiAnalysis: string;
} {
  const index = summary.indexOf(AI_SUMMARY_DELIMITER);
  if (index === -1) {
    return { body: summary, aiAnalysis: "" };
  }

  return {
    body: summary.slice(0, index),
    aiAnalysis: summary.slice(index + AI_SUMMARY_DELIMITER.length).trim(),
  };
}

export function composeSummary(body: string, aiAnalysis?: string | null): string {
  const trimmedBody = body.trim();
  const trimmedAi = aiAnalysis?.trim() ?? "";
  if (!trimmedAi) return trimmedBody;
  return `${trimmedBody}${AI_SUMMARY_DELIMITER}${trimmedAi}`;
}

function mapRow(row: Record<string, unknown>): NewsRow {
  return {
    id: Number(row.id),
    title: String(row.title),
    summary: String(row.summary),
    source_url: row.source_url == null ? null : String(row.source_url),
    published_at: new Date(String(row.published_at)),
    created_at: new Date(String(row.created_at)),
  };
}

export async function ensureNewsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS news (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          source_url TEXT,
          published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_news_published_at
        ON news (published_at DESC);
      `);
    })();
  }

  await schemaReady;
}

export async function listNews(): Promise<NewsRow[]> {
  await ensureNewsSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, title, summary, source_url, published_at, created_at
     FROM news
     ORDER BY published_at DESC, id DESC`
  );
  return result.rows.map(mapRow);
}

export async function getNewsById(id: number): Promise<NewsRow | null> {
  await ensureNewsSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, title, summary, source_url, published_at, created_at
     FROM news
     WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function createNews(input: CreateNewsInput): Promise<NewsRow> {
  await ensureNewsSchema();
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO news (title, summary, source_url, published_at)
     VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()))
     RETURNING id, title, summary, source_url, published_at, created_at`,
    [
      input.title,
      input.summary,
      input.sourceUrl ?? null,
      input.publishedAt ?? null,
    ]
  );
  return mapRow(result.rows[0]);
}

export async function updateNews(
  id: number,
  input: UpdateNewsInput
): Promise<NewsRow | null> {
  await ensureNewsSchema();
  const existing = await getNewsById(id);
  if (!existing) return null;

  const pool = getPool();
  const result = await pool.query(
    `UPDATE news
     SET title = $2,
         summary = $3,
         source_url = $4,
         published_at = $5::timestamptz
     WHERE id = $1
     RETURNING id, title, summary, source_url, published_at, created_at`,
    [
      id,
      input.title ?? existing.title,
      input.summary ?? existing.summary,
      input.sourceUrl !== undefined ? input.sourceUrl : existing.source_url,
      input.publishedAt ?? existing.published_at,
    ]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function deleteNews(id: number): Promise<boolean> {
  await ensureNewsSchema();
  const pool = getPool();
  const result = await pool.query(`DELETE FROM news WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listNewsPendingAnalysis(): Promise<NewsRow[]> {
  await ensureNewsSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, title, summary, source_url, published_at, created_at
     FROM news
     WHERE POSITION($1 IN summary) = 0
     ORDER BY created_at DESC`,
    [AI_SUMMARY_DELIMITER]
  );
  return result.rows.map(mapRow);
}

export async function updateNewsSummary(
  id: number,
  summary: string
): Promise<NewsRow | null> {
  await ensureNewsSchema();
  const pool = getPool();
  const result = await pool.query(
    `UPDATE news
     SET summary = $2
     WHERE id = $1
     RETURNING id, title, summary, source_url, published_at, created_at`,
    [id, summary]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}
