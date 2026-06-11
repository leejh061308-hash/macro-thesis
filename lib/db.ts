import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "macrolens.db");

const WATCHLIST_VERSION = 2;

export const DEFAULT_WATCHLIST = [
  { ticker: "^IXIC", name: "나스닥 종합" },
  { ticker: "^KS11", name: "코스피" },
  { ticker: "AAPL", name: "Apple" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "META", name: "Meta" },
  { ticker: "TSLA", name: "Tesla" },
];

let db: Database.Database | null = null;

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS news_summary_cache (
      article_id TEXT PRIMARY KEY,
      title_hash TEXT NOT NULL,
      ai_summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS official_news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      event_type TEXT,
      content_hash TEXT NOT NULL,
      ai_analysis TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // v2: title_hash 컬럼 추가 — 기존 캐시(잘못된 ID) 제거
  const columns = database
    .prepare("PRAGMA table_info(news_summary_cache)")
    .all() as { name: string }[];
  const hasTitleHash = columns.some((c) => c.name === "title_hash");
  if (!hasTitleHash && columns.length > 0) {
    database.exec("DROP TABLE news_summary_cache");
    database.exec(`
    CREATE TABLE news_summary_cache (
      article_id TEXT PRIMARY KEY,
      title_hash TEXT NOT NULL,
      ai_summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `);
  }

}

function seedWatchlist(database: Database.Database) {
  const insert = database.prepare(
    "INSERT INTO watchlist (ticker, name, sort_order) VALUES (?, ?, ?)"
  );
  DEFAULT_WATCHLIST.forEach((item, index) => {
    insert.run(item.ticker, item.name, index);
  });
}

function migrateWatchlist(database: Database.Database) {
  const row = database
    .prepare("SELECT value FROM app_meta WHERE key = 'watchlist_version'")
    .get() as { value: string } | undefined;

  const currentVersion = row ? Number(row.value) : 0;
  if (currentVersion >= WATCHLIST_VERSION) return;

  database.exec("DELETE FROM watchlist");
  seedWatchlist(database);

  database
    .prepare(
      `INSERT INTO app_meta (key, value) VALUES ('watchlist_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(String(WATCHLIST_VERSION));
}

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
    migrateWatchlist(db);
  }
  return db;
}

export function getWatchlist(): { ticker: string; name: string; sortOrder: number }[] {
  const database = getDb();
  const rows = database
    .prepare(
      "SELECT ticker, name, sort_order as sortOrder FROM watchlist ORDER BY sort_order ASC"
    )
    .all() as { ticker: string; name: string; sortOrder: number }[];
  return rows;
}

export function getWatchlistSafe(): {
  ticker: string;
  name: string;
  sortOrder: number;
}[] {
  try {
    return getWatchlist();
  } catch (error) {
    console.error("Watchlist DB error:", error);
    return DEFAULT_WATCHLIST.map((item, index) => ({
      ticker: item.ticker,
      name: item.name,
      sortOrder: index,
    }));
  }
}

export function addToWatchlist(ticker: string, name: string): boolean {
  const database = getDb();
  const maxOrder = database
    .prepare("SELECT COALESCE(MAX(sort_order), -1) as maxOrder FROM watchlist")
    .get() as { maxOrder: number };

  try {
    database
      .prepare(
        "INSERT INTO watchlist (ticker, name, sort_order) VALUES (?, ?, ?)"
      )
      .run(ticker, name, maxOrder.maxOrder + 1);
    return true;
  } catch {
    return false;
  }
}

export function removeFromWatchlist(ticker: string): boolean {
  const database = getDb();
  const result = database
    .prepare("DELETE FROM watchlist WHERE ticker = ?")
    .run(ticker);
  return result.changes > 0;
}

export function getCachedSummary(
  articleId: string,
  titleHash: string
): string | null {
  const database = getDb();
  const row = database
    .prepare(
      "SELECT title_hash as titleHash, ai_summary as aiSummary FROM news_summary_cache WHERE article_id = ?"
    )
    .get(articleId) as { titleHash: string; aiSummary: string } | undefined;

  if (!row || row.titleHash !== titleHash) return null;
  return row.aiSummary;
}

export function cacheSummary(
  articleId: string,
  titleHash: string,
  aiSummary: string
) {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO news_summary_cache (article_id, title_hash, ai_summary)
       VALUES (?, ?, ?)
       ON CONFLICT(article_id) DO UPDATE SET
         title_hash = excluded.title_hash,
         ai_summary = excluded.ai_summary,
         created_at = datetime('now')`
    )
    .run(articleId, titleHash, aiSummary);
}

export interface OfficialNewsRow {
  id: number;
  title: string;
  content: string;
  eventType: string | null;
  contentHash: string;
  aiAnalysis: string | null;
  createdAt: string;
}

export function getOfficialNews(): OfficialNewsRow[] {
  const database = getDb();
  return database
    .prepare(
      `SELECT id, title, content, event_type as eventType, content_hash as contentHash,
              ai_analysis as aiAnalysis, created_at as createdAt
       FROM official_news
       ORDER BY created_at DESC`
    )
    .all() as OfficialNewsRow[];
}

export function getOfficialNewsById(id: number): OfficialNewsRow | null {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT id, title, content, event_type as eventType, content_hash as contentHash,
              ai_analysis as aiAnalysis, created_at as createdAt
       FROM official_news WHERE id = ?`
    )
    .get(id) as OfficialNewsRow | undefined;
  return row ?? null;
}

export function createOfficialNews(
  title: string,
  content: string,
  eventType: string | null,
  contentHash: string,
  aiAnalysis: string | null
): OfficialNewsRow {
  const database = getDb();
  const result = database
    .prepare(
      `INSERT INTO official_news (title, content, event_type, content_hash, ai_analysis)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(title, content, eventType, contentHash, aiAnalysis);

  const row = getOfficialNewsById(Number(result.lastInsertRowid));
  if (!row) throw new Error("Failed to create official news");
  return row;
}

export function updateOfficialNewsAnalysis(id: number, aiAnalysis: string) {
  const database = getDb();
  database
    .prepare("UPDATE official_news SET ai_analysis = ? WHERE id = ?")
    .run(aiAnalysis, id);
}

export function deleteOfficialNews(id: number): boolean {
  const database = getDb();
  const result = database
    .prepare("DELETE FROM official_news WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function getOfficialNewsPendingAnalysis(): OfficialNewsRow[] {
  const database = getDb();
  return database
    .prepare(
      `SELECT id, title, content, event_type as eventType, content_hash as contentHash,
              ai_analysis as aiAnalysis, created_at as createdAt
       FROM official_news
       WHERE ai_analysis IS NULL OR ai_analysis = ''
       ORDER BY created_at DESC`
    )
    .all() as OfficialNewsRow[];
}
