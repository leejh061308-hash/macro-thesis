import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

function resolveDataDir(): string {
  const configured =
    process.env.DATA_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();

  if (configured) {
    return path.resolve(configured);
  }

  return path.join(process.cwd(), "data");
}

const DATA_DIR = resolveDataDir();
const DB_PATH = path.join(DATA_DIR, "macrolens.db");

let db: Database.Database | null = null;

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS news_summary_cache (
      article_id TEXT PRIMARY KEY,
      title_hash TEXT NOT NULL,
      ai_summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

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

export function getDataDir(): string {
  return DATA_DIR;
}

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
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
