"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import ResearchDisclaimer from "@/components/layout/ResearchDisclaimer";
import type { TimingOpportunity } from "@/lib/timing/types";

interface TodaysOpportunitiesProps {
  variant?: "default" | "home";
  items?: TimingOpportunity[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

async function fetchOpportunities(signal?: AbortSignal): Promise<TimingOpportunity[]> {
  const res = await fetch("/api/timing/opportunities", {
    cache: "no-store",
    signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "로드 실패");
  return data.opportunities ?? [];
}

export default function TodaysOpportunities({
  variant = "default",
  items: externalItems,
  loading: externalLoading,
  error: externalError,
  onRetry: externalRetry,
}: TodaysOpportunitiesProps) {
  const [items, setItems] = useState<TimingOpportunity[]>(externalItems ?? []);
  const [loading, setLoading] = useState(externalLoading ?? externalItems == null);
  const [error, setError] = useState<string | null>(externalError ?? null);
  const selfFetch = externalItems === undefined && externalLoading === undefined;

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpportunities(signal);
      setItems(data);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setItems([]);
      setError("오늘의 기회를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selfFetch) {
      setItems(externalItems ?? []);
      setLoading(externalLoading ?? false);
      setError(externalError ?? null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    void load(controller.signal);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [selfFetch, externalItems, externalLoading, externalError, load]);

  const handleRetry = () => {
    if (externalRetry) {
      externalRetry();
      return;
    }
    void load();
  };

  const isHome = variant === "home";
  const showSection = loading || error != null || items.length > 0;

  if (!showSection && !selfFetch) return null;
  if (!showSection) return null;

  return (
    <section>
      <div className="mb-3">
        <h3 className="section-title">오늘의 기회</h3>
        <p className="section-subtitle">진입 점수가 크게 상승한 종목</p>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-card bg-surface-card shadow-card"
            />
          ))}
          <p className="text-center text-[11px] text-muted">진입 점수 분석 중…</p>
        </div>
      )}

      {!loading && error && (
        <Card padding="md" className="space-y-2 text-center">
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="text-xs text-accent hover:underline"
          >
            다시 시도
          </button>
        </Card>
      )}

      {!loading && !error && items.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-muted">
            최근 30일 대비 진입 점수가 크게 오른 종목이 없습니다.
          </p>
        </Card>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.ticker}
              href={`/stocks/${encodeURIComponent(item.ticker)}`}
            >
              <Card interactive padding="sm" className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">{item.ticker}</p>
                  <p className="text-[11px] text-muted">{item.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">진입 점수</p>
                  <p className="font-semibold text-text">
                    <span className="text-muted">{item.priorScore}</span>
                    <span className="mx-1 text-muted">→</span>
                    <span className="text-accent">{item.timingScore}</span>
                  </p>
                  <p className="text-[10px] text-bullish">+{item.change}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!isHome && !loading && <ResearchDisclaimer variant="timing" className="mt-3" />}
    </section>
  );
}

export { fetchOpportunities };
