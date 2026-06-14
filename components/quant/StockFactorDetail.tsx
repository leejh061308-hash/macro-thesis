"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Pill from "@/components/ui/Pill";
import ScoreGauge from "@/components/ui/ScoreGauge";
import { deriveBasicStockView, riskColor } from "@/lib/quant/basic-view";
import type { QuantViewMode } from "@/lib/quant/basic-view";
import type {
  FactorId,
  FactorWeights,
  StockFactorDetailResponse,
  UniverseId,
} from "@/lib/quant/types";
import { FACTOR_LABELS, ALL_FACTOR_IDS } from "@/lib/quant/factors";

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

const PILL_VARIANTS = ["blue", "purple", "green", "neutral"] as const;

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
    <Card padding="md" className="animate-slide-up ring-1 ring-accent/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] text-muted">
            {isBasic ? "종목 분석" : "팩터 분석 · 전문가"}
          </p>
          {loading ? (
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-white/5" />
          ) : detail ? (
            <>
              <h4 className="text-base font-bold text-text">{detail.name}</h4>
              {!isBasic && (
                <p className="text-xs text-muted">{detail.ticker}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-bearish">데이터 없음</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:bg-white/5 hover:text-text"
        >
          닫기
        </button>
      </div>

      {detail && basic && !loading && isBasic && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <Card padding="sm" className="flex flex-col items-center">
              <ScoreGauge
                score={basic.aiScore}
                label="AI 추천도"
                sublabel={basic.aiScore >= 70 ? "긍정적" : "관심"}
                size="sm"
              />
            </Card>
            <Card padding="sm" className="flex flex-col items-center">
              <ScoreGauge
                score={basic.attractiveness}
                label="투자 매력도"
                sublabel={basic.attractiveness >= 70 ? "관심 구간" : "보통"}
                size="sm"
              />
            </Card>
            <Card padding="sm" className="flex flex-col items-center justify-center text-center">
              <p className="text-[10px] text-muted">위험도</p>
              <p className={`mt-2 text-lg font-bold ${riskColor(basic.riskLabel)}`}>
                {basic.riskLabel}
              </p>
            </Card>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">투자 스타일</p>
            <div className="flex flex-wrap gap-1.5">
              {basic.styleTags.map((tag, i) => (
                <Pill key={tag} variant={PILL_VARIANTS[i % PILL_VARIANTS.length]}>
                  {tag}
                </Pill>
              ))}
            </div>
          </div>

          <Card padding="md" className="bg-accent/5">
            <p className="text-[11px] font-semibold text-accent mb-1">한줄 평가</p>
            <p className="text-sm leading-relaxed text-text-secondary">
              {basic.oneLiner}
            </p>
          </Card>

          <Link
            href={`/stocks/${encodeURIComponent(detail.ticker)}`}
            className="block w-full rounded-xl bg-white/5 py-2.5 text-center text-xs text-muted transition-colors hover:bg-white/10 hover:text-accent"
          >
            종목 상세 페이지 →
          </Link>
        </div>
      )}

      {detail && !loading && !isBasic && (
        <div className="mt-5 space-y-4">
          <Card padding="md" className="text-center bg-accent-secondary/5">
            <p className="text-xs text-muted">Overall Score</p>
            <p className="mt-1 text-3xl font-semibold text-accent-secondary">
              {detail.overallScore}
            </p>
            {detail.overallRank > 0 && (
              <p className="mt-1 text-[10px] text-muted">
                유니버스 #{detail.overallRank}
              </p>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(ALL_FACTOR_IDS as FactorId[]).map((f) => (
              <Card key={f} padding="sm">
                <p className="text-[10px] text-muted">
                  {FACTOR_LABELS[f].shortName}
                </p>
                <p className="mt-1 text-lg font-semibold text-text">
                  {detail.factors[f]}
                </p>
                {detail.factorRanks[f] > 0 && (
                  <p className="text-[10px] text-muted">#{detail.factorRanks[f]}</p>
                )}
                {detail.factorConfidence?.[f] === "low" && (
                  <p className="mt-0.5 text-[9px] text-amber-400">데이터 신뢰도 낮음</p>
                )}
              </Card>
            ))}
          </div>

          <FactorBarChart factors={detail.factors} />

          {detail.metrics && (
            <div className="grid grid-cols-3 gap-2">
              <MetricChip label="PER" value={fmtNum(detail.metrics.peRatio)} />
              <MetricChip label="ROE" value={fmtPct(detail.metrics.roe)} />
              <MetricChip label="Beta" value={fmtNum(detail.metrics.beta, 2)} />
            </div>
          )}

          <Card padding="md" className="bg-accent/5">
            <p className="text-[11px] font-semibold text-accent mb-1">AI 해석</p>
            <p className="text-xs leading-relaxed text-text-secondary">
              {detail.aiSummary}
            </p>
          </Card>
        </div>
      )}
    </Card>
  );
}

function FactorBarChart({ factors }: { factors: Record<FactorId, number> }) {
  const items = (ALL_FACTOR_IDS as FactorId[])
    .map((f) => ({ factor: f, label: FACTOR_LABELS[f].shortName, score: factors[f] }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted">팩터 기여도</p>
      {items.map((item) => {
        const strength =
          item.score >= 80 ? "+++" : item.score >= 65 ? "++" : item.score >= 50 ? "+" : "";
        return (
          <div key={item.factor} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-text-secondary">{item.label}</span>
              <span className="font-medium text-accent">{strength || "·"}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all duration-700"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="sm" className="text-center">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="text-sm font-semibold text-text">{value}</p>
    </Card>
  );
}
