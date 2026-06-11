"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import IndexChartView from "@/components/stocks/IndexChartView";
import RefreshStatus from "@/components/stocks/RefreshStatus";
import StockChart from "@/components/stocks/StockChart";
import StockMetrics from "@/components/stocks/StockMetrics";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { STOCK_REFRESH_INTERVAL } from "@/lib/constants";
import { isIndexTicker, normalizeTicker } from "@/lib/tickers";
import type { StockDetail } from "@/lib/types";

interface StockDetailViewProps {
  ticker: string;
}

export default function StockDetailView({ ticker: rawTicker }: StockDetailViewProps) {
  const ticker = useMemo(() => normalizeTicker(rawTicker), [rawTicker]);

  if (isIndexTicker(ticker)) {
    return <IndexChartView ticker={ticker} />;
  }

  return <StockDetailContent ticker={ticker} />;
}

function StockDetailContent({ ticker }: { ticker: string }) {
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20_000);

      try {
        const res = await fetch(`/api/stocks/${encodeURIComponent(ticker)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "종목을 찾을 수 없습니다.");
        }

        setDetail(data);
        setLastUpdated(new Date());
        if (!silent) setError(null);
      } catch (err) {
        if (!silent) {
          setDetail(null);
          setError(
            err instanceof Error && err.name === "AbortError"
              ? "시세 로딩 시간이 초과되었습니다."
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
    },
    [ticker]
  );

  useEffect(() => {
    loadDetail(false);
  }, [loadDetail]);

  useAutoRefresh(
    () => loadDetail(true),
    STOCK_REFRESH_INTERVAL,
    !!detail && !error
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-border" />
        <div className="h-32 animate-pulse rounded-xl border border-surface-border bg-surface-card" />
        <div className="h-56 animate-pulse rounded-xl border border-surface-border bg-surface-card" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/stocks"
          className="inline-flex items-center gap-1 text-xs text-neutral hover:text-accent transition-colors"
        >
          ← 관심종목
        </Link>
        <div className="rounded-lg border border-bearish/30 bg-bearish/10 px-4 py-3 text-sm text-bearish">
          {error ?? "종목을 찾을 수 없습니다."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/stocks"
          className="inline-flex items-center gap-1 text-xs text-neutral hover:text-accent transition-colors"
        >
          ← 관심종목
        </Link>
        <RefreshStatus
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          intervalSec={STOCK_REFRESH_INTERVAL / 1000}
        />
      </div>

      <StockMetrics detail={detail} />
      <StockChart ticker={detail.ticker} />
    </div>
  );
}
