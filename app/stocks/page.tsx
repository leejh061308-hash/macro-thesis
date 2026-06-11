"use client";

import { useCallback, useEffect, useState } from "react";
import RefreshStatus from "@/components/stocks/RefreshStatus";
import StockCard from "@/components/stocks/StockCard";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { STOCK_REFRESH_INTERVAL } from "@/lib/constants";
import { WATCHLIST_UPDATED_EVENT } from "@/lib/watchlist-events";
import type { StockQuote } from "@/lib/types";

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [removingTicker, setRemovingTicker] = useState<string | null>(null);

  const loadStocks = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch("/api/stocks", {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "종목 데이터를 불러오지 못했습니다.");
      }

      setStocks(data.stocks ?? []);
      setLastUpdated(new Date());
      if (!silent) setError(null);
    } catch (err) {
      if (!silent) {
        setStocks([]);
        setError(
          err instanceof Error && err.name === "AbortError"
            ? "시세 로딩 시간이 초과되었습니다. 새로고침해 주세요."
            : err instanceof Error
              ? err.message
              : "종목 데이터를 불러오지 못했습니다."
        );
      }
    } finally {
      clearTimeout(timeoutId);
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadStocks(false);
  }, [loadStocks]);

  useEffect(() => {
    const handleWatchlistUpdated = () => loadStocks(true);
    window.addEventListener(WATCHLIST_UPDATED_EVENT, handleWatchlistUpdated);
    return () =>
      window.removeEventListener(WATCHLIST_UPDATED_EVENT, handleWatchlistUpdated);
  }, [loadStocks]);

  useAutoRefresh(
    () => loadStocks(true),
    STOCK_REFRESH_INTERVAL,
    !isLoading && !error
  );

  useEffect(() => {
    if (!actionMessage) return;
    const id = setTimeout(() => setActionMessage(null), 3000);
    return () => clearTimeout(id);
  }, [actionMessage]);

  const handleRemoveWatchlist = async (ticker: string) => {
    setRemovingTicker(ticker);
    try {
      const res = await fetch(
        `/api/watchlist?ticker=${encodeURIComponent(ticker)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "관심종목 삭제에 실패했습니다.");
      }

      setStocks((prev) => prev.filter((s) => s.ticker !== ticker));
      setActionMessage(`${ticker} 관심종목에서 삭제했습니다.`);
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "관심종목 삭제에 실패했습니다."
      );
    } finally {
      setRemovingTicker(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">관심종목</h2>
          <p className="text-[11px] text-gray-500">
            시세는 정규장(본장) 기준입니다. 장외마켓은 반영하지 않습니다.
          </p>
          {isLoading ? (
            <p className="mt-1 text-xs text-neutral">시세 불러오는 중...</p>
          ) : (
            <div className="mt-1">
              <RefreshStatus
                lastUpdated={lastUpdated}
                isRefreshing={isRefreshing}
                intervalSec={STOCK_REFRESH_INTERVAL / 1000}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => loadStocks(false)}
          disabled={isLoading}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {actionMessage && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent">
          {actionMessage}
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-surface-border bg-surface-card"
            />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-bearish/30 bg-bearish/10 px-4 py-3 text-sm text-bearish">
          {error}
        </div>
      )}

      {!isLoading && !error && stocks.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-border px-4 py-8 text-center text-sm text-gray-500">
          관심종목이 없습니다.
          <br />
          상단 검색에서 티커를 찾아 + 관심을 눌러 추가하세요.
        </div>
      )}

      {!isLoading && !error && stocks.length > 0 && (
        <div className="space-y-3">
          {stocks.map((stock) => (
            <StockCard
              key={stock.ticker}
              stock={stock}
              onRemove={handleRemoveWatchlist}
              isRemoving={removingTicker === stock.ticker}
            />
          ))}
        </div>
      )}
    </div>
  );
}
