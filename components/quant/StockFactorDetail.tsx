"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FactorId, FactorWeights, RankingEntry, UniverseId } from "@/lib/quant/types";
import { FACTOR_LABELS } from "@/lib/quant/factors";

interface StockFactorDetailProps {
  ticker: string;
  universeId: UniverseId;
  weights: FactorWeights;
  onClose: () => void;
}

export default function StockFactorDetail({
  ticker,
  universeId,
  weights,
  onClose,
}: StockFactorDetailProps) {
  const [detail, setDetail] = useState<RankingEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    const params = new URLSearchParams({ universe: universeId });
    for (const [k, v] of Object.entries(weights)) {
      params.set(`w_${k}`, String(v ?? 0));
    }
    fetch(`/api/quant/factors/${encodeURIComponent(ticker)}?${params}`)
      .then((res) => res.json())
      .then((data) => setDetail(data as RankingEntry))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [ticker, universeId, weights]);

  if (!ticker) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-surface-card p-4 card-glow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] text-neutral">종목 상세 · 팩터 분석</p>
          {loading ? (
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-surface-border/40" />
          ) : detail ? (
            <>
              <h4 className="text-base font-bold text-white">{detail.name}</h4>
              <p className="text-xs text-neutral">{detail.ticker}</p>
            </>
          ) : (
            <p className="text-sm text-bearish">데이터 없음</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-neutral hover:text-white"
        >
          닫기
        </button>
      </div>

      {detail && !loading && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-400">Overall Rank</span>
              <span className="font-mono text-xl font-bold text-accent">
                {detail.overallScore}
              </span>
            </div>
            {detail.overallRank > 0 && (
              <p className="mt-1 text-[10px] text-neutral">
                유니버스 #{detail.overallRank}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(FACTOR_LABELS) as FactorId[]).map((f) => (
              <div
                key={f}
                className="rounded-lg border border-surface-border px-3 py-2"
              >
                <p className="text-[10px] text-neutral">{FACTOR_LABELS[f].shortName}</p>
                <p className="font-mono text-sm font-semibold text-white">
                  {detail.factors[f]}
                </p>
                {detail.factorRanks[f] > 0 && (
                  <p className="text-[10px] text-neutral">#{detail.factorRanks[f]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-surface-border p-3">
            <p className="text-[11px] font-semibold text-accent mb-1">AI 해석</p>
            <p className="text-xs leading-relaxed text-gray-300">{detail.aiSummary}</p>
          </div>

          <Link
            href={`/stocks/${encodeURIComponent(detail.ticker)}`}
            className="block w-full rounded-lg border border-surface-border py-2 text-center text-xs text-gray-400 hover:text-accent"
          >
            종목 상세 페이지 →
          </Link>
        </div>
      )}
    </div>
  );
}
