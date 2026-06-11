import { getPool, isPostgresConfigured } from "@/lib/postgres";
import type { WatchlistItem } from "@/lib/types";

export const DEFAULT_WATCHLIST: Array<{ ticker: string; name: string }> = [
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

let schemaReady: Promise<void> | null = null;

function mapRow(row: Record<string, unknown>): WatchlistItem {
  return {
    ticker: String(row.ticker),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
  };
}

export async function ensureWatchlistSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS watchlist (
          id SERIAL PRIMARY KEY,
          ticker TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_watchlist_sort_order
        ON watchlist (sort_order ASC);
      `);
    })();
  }

  await schemaReady;
}

async function seedDefaultWatchlist(): Promise<void> {
  const pool = getPool();
  for (const [index, item] of DEFAULT_WATCHLIST.entries()) {
    await pool.query(
      `INSERT INTO watchlist (ticker, name, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (ticker) DO NOTHING`,
      [item.ticker, item.name, index]
    );
  }
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  await ensureWatchlistSchema();
  const pool = getPool();

  let result = await pool.query(
    `SELECT ticker, name, sort_order
     FROM watchlist
     ORDER BY sort_order ASC, id ASC`
  );

  if (result.rows.length === 0) {
    await seedDefaultWatchlist();
    result = await pool.query(
      `SELECT ticker, name, sort_order
       FROM watchlist
       ORDER BY sort_order ASC, id ASC`
    );
  }

  return result.rows.map(mapRow);
}

export async function listWatchlistSafe(): Promise<WatchlistItem[]> {
  if (!isPostgresConfigured()) {
    return DEFAULT_WATCHLIST.map((item, index) => ({
      ticker: item.ticker,
      name: item.name,
      sortOrder: index,
    }));
  }

  try {
    return await listWatchlist();
  } catch (error) {
    console.error("Watchlist DB error:", error);
    return DEFAULT_WATCHLIST.map((item, index) => ({
      ticker: item.ticker,
      name: item.name,
      sortOrder: index,
    }));
  }
}

export async function addToWatchlist(
  ticker: string,
  name: string
): Promise<boolean> {
  await ensureWatchlistSchema();
  const pool = getPool();

  const maxResult = await pool.query(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM watchlist`
  );
  const nextOrder = Number(maxResult.rows[0]?.max_order ?? -1) + 1;

  const result = await pool.query(
    `INSERT INTO watchlist (ticker, name, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (ticker) DO NOTHING
     RETURNING id`,
    [ticker, name, nextOrder]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function removeFromWatchlist(ticker: string): Promise<boolean> {
  await ensureWatchlistSchema();
  const pool = getPool();
  const result = await pool.query(`DELETE FROM watchlist WHERE ticker = $1`, [
    ticker,
  ]);
  return (result.rowCount ?? 0) > 0;
}
