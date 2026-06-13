"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScoreCards from "@/components/timing/ScoreCards";
import TimingHistoryChart from "@/components/timing/TimingHistoryChart";
import TimingPanel from "@/components/timing/TimingPanel";
import {
  deriveBasicStockViewFromStrategy,
  deriveRiskFromScores,
  riskColor,
} from "@/lib/quant/basic-view";
import type { TimingScoreResult } from "@/lib/timing/types";
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
  const [timing, setTiming] = useState<TimingScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/quant/strategies/${strategyId}?limit=50`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/timing/${encodeURIComponent(ticker)}`, { cache: "no-store" }).then(
        (r) => r.json()
      ),
    ])
      .then(([strategyData, timingData]) => {
        const found = (strategyData.results as StrategyResult[] | undefined)?.find(
          (r) => r.ticker === ticker
        );
        setItem(found ?? null);
        setTiming(timingData.timing ?? null);
      })
      .catch(() => {
        setItem(null);
        setTiming(null);
      })
      .finally(() => setLoading(false));
  }, [ticker, strategyId]);

  if (!ticker) return null;

  const basic = item ? deriveBasicStockViewFromStrategy(item) : null;
  const riskLabel = deriveRiskFromScores(
    timing?.companyScore ?? item?.companyScore ?? null,
    timing?.timingScore ?? item?.timingScore ?? null
  );

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

      {loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-surface-border/40" />
      ) : timing ? (
        <div className="mt-4 space-y-4">
          <ScoreCards timing={timing} />

          <div className="rounded-lg border border-surface-border px-3 py-2">
            <p className="text-[10px] text-neutral">위험도</p>
            <p className={`text-sm font-semibold ${riskColor(riskLabel)}`}>
              {riskLabel}
            </p>
          </div>

          {basic && (
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
          )}

          <TimingPanel ticker={ticker} timing={timing} showBreakdown={false} />
          <TimingHistoryChart ticker={ticker} compact />

          <Link
            href={`/stocks/${encodeURIComponent(ticker)}`}
            className="block w-full rounded-lg border border-surface-border py-2 text-center text-xs text-gray-400 hover:text-accent"
          >
            종목 상세 페이지 →
          </Link>
        </div>
      ) : item && basic ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="기업 점수" value={String(item.companyScore ?? basic.attractiveness)} />
            <Metric label="진입 점수" value={String(item.timingScore ?? "—")} highlight />
            <div>
              <p className="text-[10px] text-neutral">위험도</p>
              <p className={`text-sm font-semibold ${riskColor(riskLabel)}`}>
                {riskLabel}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{basic.oneLiner}</p>
        </div>
      ) : null}
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
