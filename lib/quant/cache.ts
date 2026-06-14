const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/** TTL 만료 후에도 staleGraceMs 동안은 이전 값 반환 (stale-while-revalidate) */
export function getStaleCached<T>(
  key: string,
  staleGraceMs: number
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt + staleGraceMs) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export const METRICS_CACHE_TTL = 60 * 60 * 1000;
export const BACKTEST_CACHE_TTL = 6 * 60 * 60 * 1000;
export const STALE_GRACE_TTL = 6 * 60 * 60 * 1000;
