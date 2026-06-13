"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deriveBasicStockViewFromStrategy,
  riskColor,
} from "@/lib/quant/basic-view";
import type { StrategyId, StrategyResult } from "@/lib/quant/types";

interface BasicStockDetailProps {
  ticker: string;
  strategyId: StrategyId;
  onClose: () => void;
}

export default function BasicStockDetail({
  ticker,
  strategyId,
  onClose,
}: BasicStockDetailProps) {
  const [item, setItem] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/quant/strategies/${strategyId}?limit=50`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const found = (data.results as StrategyResult[] | undefined)?.find(
          (r) => r.ticker === ticker
        );
        setItem(found ?? null);
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [ticker, strategyId]);

  if (!ticker) return null;

  const basic = item ? deriveBasicStockViewFromStrategy(item) : null;

  return (
    <div className="rounded-xl border border-accent/30 bg-surface-card p-4 card-glow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] text-neutral">종목 분석</p>
          {loading ? (
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-surface-border/40" />
          ) : item ? (
            <h4 className="text-base font-bold text-white">{item.name}</h4>
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

      {basic && item && !loading && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="AI 추천도" value={String(basic.aiScore)} highlight />
            <Metric label="투자 매력도" value={String(basic.attractiveness)} />
            <div>
              <p className="text-[10px] text-neutral">위험도</p>
              <p className={`text-lg font-semibold ${riskColor(basic.riskLabel)}`}>
                {basic.riskLabel}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-neutral">투자 스타일</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {basic.styleTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-surface-border p-3">
            <p className="text-[11px] font-semibold text-gray-400 mb-1">한줄 평가</p>
            <p className="text-sm leading-relaxed text-gray-300">{basic.oneLiner}</p>
          </div>

          {item.reasons.length > 1 && (
            <div className="rounded-lg border border-surface-border p-3">
              <p className="text-[11px] font-semibold text-gray-400 mb-1">추천 이유</p>
              <ul className="space-y-1">
                {item.reasons.map((r) => (
                  <li key={r} className="text-xs text-gray-400">
                    · {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href={`/stocks/${encodeURIComponent(item.ticker)}`}
            className="block w-full rounded-lg border border-surface-border py-2 text-center text-xs text-gray-400 hover:text-accent"
          >
            종목 상세 페이지 →
          </Link>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-border px-3 py-2">
      <p className="text-[10px] text-neutral">{label}</p>
      <p
        className={`font-mono text-lg font-semibold ${
          highlight ? "text-accent" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
