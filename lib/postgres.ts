import { Pool } from "pg";

let pool: Pool | null = null;

export function isPostgresConfigured(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }

    const useSsl =
      !connectionString.includes("localhost") &&
      !connectionString.includes("127.0.0.1");

    pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }

  return pool;
}
