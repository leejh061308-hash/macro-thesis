"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deriveBasicStockView, riskColor } from "@/lib/quant/basic-view";
import type { QuantViewMode } from "@/lib/quant/basic-view";
import type {
  FactorId,
  FactorWeights,
  StockFactorDetailResponse,
  UniverseId,
} from "@/lib/quant/types";
import { FACTOR_LABELS } from "@/lib/quant/factors";

interface StockFactorDetailProps {
  viewMode: QuantViewMode;
  ticker: string;
  universeId: UniverseId;
  weights: FactorWeights;
  onClose: () => void;
}

function fmtPct(v: number | null, digits = 1): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

function fmtNum(v: number | null, digits = 1): string {
  if (v == null) return "—";
  return v.toFixed(digits);
}

export default function StockFactorDetail({
  viewMode,
  ticker,
  universeId,
  weights,
  onClose,
}: StockFactorDetailProps) {
  const [detail, setDetail] = useState<StockFactorDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const isBasic = viewMode === "basic";

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    const params = new URLSearchParams({ universe: universeId });
    for (const [k, v] of Object.entries(weights)) {
      params.set(`w_${k}`, String(v ?? 0));
    }
    fetch(`/api/quant/factors/${encodeURIComponent(ticker)}?${params}`)
      .then((res) => res.json())
      .then((data) => setDetail(data as StockFactorDetailResponse))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [ticker, universeId, weights]);

  if (!ticker) return null;

  const basic = detail ? deriveBasicStockView(detail) : null;

  return (
    <div className="rounded-xl border border-accent/30 bg-surface-card p-4 card-glow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] text-neutral">
            {isBasic ? "종목 분석" : "종목 상세 · 팩터 분석"}
          </p>
          {loading ? (
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-surface-border/40" />
          ) : detail ? (
            <>
              <h4 className="text-base font-bold text-white">{detail.name}</h4>
              {!isBasic && <p className="text-xs text-neutral">{detail.ticker}</p>}
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

      {detail && basic && !loading && isBasic && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="AI 추천도" value={String(basic.aiScore)} highlight />
            <MetricCard label="투자 매력도" value={String(basic.attractiveness)} />
            <div className="rounded-lg border border-surface-border px-3 py-2">
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

          <Link
            href={`/stocks/${encodeURIComponent(detail.ticker)}`}
            className="block w-full rounded-lg border border-surface-border py-2 text-center text-xs text-gray-400 hover:text-accent"
          >
            종목 상세 페이지 →
          </Link>
        </div>
      )}

      {detail && !loading && !isBasic && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-400">Overall Score</span>
              <span className="font-mono text-xl font-bold text-accent">
                {detail.overallScore}
              </span>
            </div>
            {detail.overallRank > 0 && (
              <p className="mt-1 text-[10px] text-neutral">
                Overall Rank #{detail.overallRank}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(FACTOR_LABELS) as FactorId[]).map((f) => (
              <div
                key={f}
                className="rounded-lg border border-surface-border px-3 py-2"
              >
                <p className="text-[10px] text-neutral">
                  {FACTOR_LABELS[f].shortName}
                </p>
                <p className="font-mono text-sm font-semibold text-white">
                  {detail.factors[f]}
                </p>
                {detail.factorRanks[f] > 0 && (
                  <p className="text-[10px] text-neutral">
                    {FACTOR_LABELS[f].shortName} Rank #{detail.factorRanks[f]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {detail.contribution && (
            <div className="rounded-lg border border-surface-border p-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-400">Overall Score</span>
                <span className="font-mono text-lg font-bold text-accent">
                  {detail.contribution.overallScore}
                </span>
              </div>
              <p className="text-[10px] text-neutral">팩터 기여도 (중립 50 기준)</p>
              <div className="flex flex-wrap gap-2">
                {detail.contribution.items.map((item) => (
                  <span
                    key={item.factor}
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                      item.contribution >= 0
                        ? "border-bullish/30 text-bullish"
                        : "border-bearish/30 text-bearish"
                    }`}
                  >
                    {item.contribution >= 0 ? "+" : "-"}
                    {item.label} {item.contribution >= 0 ? "+" : ""}
                    {item.contribution}
                  </span>
                ))}
              </div>
              <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                <p className="text-[10px] font-semibold text-accent mb-0.5">AI 해석</p>
                <p className="text-xs leading-relaxed text-gray-300">
                  {detail.contribution.aiExplanation}
                </p>
              </div>
            </div>
          )}

          {detail.metrics && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MetricCard label="PER" value={fmtNum(detail.metrics.peRatio)} />
              <MetricCard label="PBR" value={fmtNum(detail.metrics.pbRatio)} />
              <MetricCard label="EV/EBITDA" value={fmtNum(detail.metrics.evToEbitda)} />
              <MetricCard label="FCF Yield" value={fmtPct(detail.metrics.freeCashFlowYield)} />
              <MetricCard label="ROE" value={fmtPct(detail.metrics.roe)} />
              <MetricCard label="ROIC" value={fmtPct(detail.metrics.roic)} />
              <MetricCard
                label="Volatility"
                value={
                  detail.metrics.volatility != null
                    ? `${detail.metrics.volatility.toFixed(1)}%`
                    : "—"
                }
              />
              <MetricCard
                label="MDD"
                value={
                  detail.metrics.maxDrawdown != null
                    ? `-${detail.metrics.maxDrawdown.toFixed(1)}%`
                    : "—"
                }
              />
              <MetricCard label="Beta" value={fmtNum(detail.metrics.beta, 2)} />
            </div>
          )}

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

function MetricCard({
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
        className={`font-mono text-sm font-semibold ${
          highlight ? "text-accent" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
