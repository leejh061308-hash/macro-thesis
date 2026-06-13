"use client";

import { useEffect, useState } from "react";
import QuantLoadingState from "./QuantLoadingState";
import { FACTOR_LABELS } from "@/lib/quant/factors";
import { PORTFOLIO_PRESETS } from "@/lib/quant/market-analytics";
import type { PortfolioPreset } from "@/lib/quant/market-analytics";
import type { RankingEntry, UniverseId } from "@/lib/quant/types";

interface PortfolioResponse {
  preset: PortfolioPreset;
  entries: RankingEntry[];
  weights: PortfolioPreset["weights"];
  universe: UniverseId;
  universeSize: number;
  updatedAt: string;
}

interface PortfolioGeneratorPanelProps {
  universeId: UniverseId;
  onSelectStock?: (ticker: string) => void;
}

export default function PortfolioGeneratorPanel({
  universeId,
  onSelectStock,
}: PortfolioGeneratorPanelProps) {
  const [presetId, setPresetId] = useState<PortfolioPreset["id"]>("balanced");
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      preset: presetId,
      universe: universeId,
      limit: "20",
    });
    fetch(`/api/quant/portfolio?${params}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json as PortfolioResponse);
      })
      .catch((e) => {
        setData(null);
        setError(e instanceof Error ? e.message : "로드 실패");
      })
      .finally(() => setLoading(false));
  }, [presetId, universeId]);

  const preset = PORTFOLIO_PRESETS.find((p) => p.id === presetId);

  return (
    <div className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <div>
        <h3 className="text-sm font-bold text-white">포트폴리오 생성기</h3>
        <p className="text-[10px] text-neutral">
          전략 유형에 따라 멀티팩터 가중치로 Top 20 포트폴리오를 자동 구성합니다
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PORTFOLIO_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPresetId(p.id)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              presetId === p.id
                ? "border-accent/40 bg-accent/10"
                : "border-surface-border hover:border-accent/20"
            }`}
          >
            <p className="text-xs font-semibold text-white">{p.name}</p>
            <p className="mt-0.5 text-[10px] text-neutral line-clamp-2">{p.description}</p>
          </button>
        ))}
      </div>

      {preset && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
          <p className="text-[10px] font-semibold text-accent mb-0.5">AI 해석</p>
          <p className="text-xs leading-relaxed text-gray-300">{preset.aiSummary}</p>
        </div>
      )}

      {loading ? (
        <QuantLoadingState label="포트폴리오 구성 중" />
      ) : error ? (
        <p className="text-sm text-bearish">{error}</p>
      ) : data ? (
        <>
          <div className="flex flex-wrap gap-2 text-[10px] text-neutral">
            {(Object.entries(data.weights) as [keyof typeof data.weights, number][]).map(
              ([factor, weight]) => (
                <span
                  key={factor}
                  className="rounded-full border border-surface-border px-2 py-0.5"
                >
                  {FACTOR_LABELS[factor].shortName} {weight}%
                </span>
              )
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border text-neutral">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">종목</th>
                  <th className="py-2 pr-2 text-right">종합</th>
                  <th className="py-2 text-right">비중</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, i) => (
                  <tr
                    key={entry.ticker}
                    className="border-b border-surface-border/50 hover:bg-accent/5"
                  >
                    <td className="py-2 pr-2 font-mono text-neutral">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => onSelectStock?.(entry.ticker)}
                        className="text-left hover:text-accent"
                      >
                        <span className="font-semibold text-white">{entry.ticker}</span>
                        <span className="ml-1 text-neutral">{entry.name}</span>
                      </button>
                    </td>
                    <td className="py-2 pr-2 text-right font-mono text-accent">
                      {entry.overallScore}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-300">
                      {(100 / data.entries.length).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
