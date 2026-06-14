"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RefreshStatus from "@/components/stocks/RefreshStatus";
import StockCard from "@/components/stocks/StockCard";
import WarmupTrigger from "@/components/quant/WarmupTrigger";
import TodaysOpportunities from "@/components/timing/TodaysOpportunities";
import WatchlistTimingSection from "@/components/timing/WatchlistTimingSection";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { STOCK_REFRESH_INTERVAL } from "@/lib/constants";
import { WATCHLIST_UPDATED_EVENT } from "@/lib/watchlist-events";
import type { StockQuote } from "@/lib/types";

const LOAD_TIMEOUT_MS = 40_000;
const LOAD_MAX_ATTEMPTS = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStocksPayload(signal: AbortSignal) {
  const res = await fetch("/api/stocks", {
    signal,
    cache: "no-store",
  });

  const raw = await res.text();
  let data: {
    stocks?: StockQuote[];
    quoteStatus?: string;
    error?: string;
  };

  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error("서버 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!res.ok) {
    throw new Error(data.error || "종목 데이터를 불러오지 못했습니다.");
  }

  return data;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [removingTicker, setRemovingTicker] = useState<string | null>(null);
  const stocksRef = useRef<StockQuote[]>([]);

  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  const loadStocks = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setError(null);
      setWarning(null);
    }

    try {
      let data: Awaited<ReturnType<typeof fetchStocksPayload>> | null = null;
      let lastError: unknown;

      for (let attempt = 1; attempt <= LOAD_MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

        try {
          data = await fetchStocksPayload(controller.signal);
          break;
        } catch (err) {
          lastError = err;
          if (attempt < LOAD_MAX_ATTEMPTS) {
            await sleep(800 * attempt);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      if (!data) {
        throw lastError;
      }

      const nextStocks = data.stocks ?? [];
      const hasPrices = nextStocks.some((stock) => stock.price > 0);
      const keepPrevious =
        !hasPrices && stocksRef.current.some((stock) => stock.price > 0);

      if (keepPrevious) {
        setLastUpdated(new Date());
        setWarning(
          "최신 시세를 불러오지 못했습니다. 이전 시세를 표시 중이며 자동으로 다시 시도합니다."
        );
        setError(null);
      } else {
        setStocks(nextStocks);
        setLastUpdated(new Date());

        if (!hasPrices) {
          const message =
            "시세 서버 응답이 지연되고 있습니다. 잠시 후 자동으로 다시 시도합니다.";
          if (silent) {
            setWarning(message);
            setError(null);
          } else {
            setError(message);
            setWarning(null);
          }
        } else if (data.quoteStatus === "partial") {
          setWarning("일부 종목 시세만 불러왔습니다. 곧 다시 갱신합니다.");
          setError(null);
        } else {
          setError(null);
          setWarning(null);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "시세 로딩 시간이 초과되었습니다. 자동으로 다시 시도합니다."
          : err instanceof Error
            ? err.message
            : "종목 데이터를 불러오지 못했습니다.";

      if (silent) {
        setWarning(message);
      } else if (stocksRef.current.length > 0) {
        setWarning(message);
        setError(null);
      } else {
        setStocks([]);
        setError(message);
      }
    } finally {
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
    !isLoading
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
      <WarmupTrigger />
      <div className="flex items-center justify-between">
        <div>
        <h2 className="text-xl font-bold text-text">관심종목</h2>
        <p className="text-xs text-muted">
          시세는 정규장(본장) 기준입니다
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

      {warning && !isLoading && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {warning}
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-bearish/30 bg-bearish/10 px-4 py-3 text-sm text-bearish">
          {error}
          <button
            type="button"
            onClick={() => loadStocks(false)}
            className="mt-2 block text-xs underline hover:text-white"
          >
            지금 다시 시도
          </button>
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
          <WatchlistTimingSection />
          <TodaysOpportunities />
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
