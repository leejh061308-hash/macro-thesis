"use client";

import { useEffect, useState } from "react";
import AnalysisSections from "@/components/analyze/AnalysisSections";
import TickerSearch from "@/components/search/TickerSearch";
import type { SearchResult, StockAnalysis } from "@/lib/types";

export default function AnalyzePanel() {
  const [watchlist, setWatchlist] = useState<{ ticker: string; name: string }[]>(
    []
  );
  const [selected, setSelected] = useState<{
    ticker: string;
    name: string;
  } | null>(null);
  const [investmentOpinion, setInvestmentOpinion] = useState("");
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stocks")
      .then((res) => res.json())
      .then((data) => {
        if (data.stocks?.length) {
          setWatchlist(
            data.stocks.map((s: { ticker: string; name: string }) => ({
              ticker: s.ticker,
              name: s.name,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchSelect = (result: SearchResult) => {
    setSelected({ ticker: result.ticker, name: result.name });
    setAnalysis(null);
    setError(null);
  };

  const handleChipSelect = (ticker: string, name: string) => {
    if (selected?.ticker === ticker) {
      setSelected(null);
    } else {
      setSelected({ ticker, name });
    }
    setAnalysis(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selected) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: selected.ticker,
          investmentOpinion: investmentOpinion.trim() || undefined,
        }),
        signal: controller.signal,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "분석에 실패했습니다.");
      }

      setAnalysis(result);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("분석 시간이 초과되었습니다. 다시 시도해주세요.");
      } else {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
        <h2 className="mb-1 text-sm font-semibold text-white">종목 선택</h2>
        <p className="mb-4 text-xs text-gray-400">
          검색으로 모든 종목을 분석할 수 있습니다. 관심종목은 빠른 선택용입니다.
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-gray-300">
            종목 검색
          </label>
          <TickerSearch
            placeholder="분석할 티커 검색 (AAPL, NVDA, MSFT...)"
            onSelect={handleSearchSelect}
          />
        </div>

        <div className="mb-4 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">
            선택된 종목
          </p>
          {selected ? (
            <>
              <p className="font-mono text-lg font-bold text-accent">
                {selected.ticker}
              </p>
              <p className="text-sm text-gray-300">{selected.name}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">종목을 선택해주세요</p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="investment-opinion"
            className="mb-2 block text-xs font-medium text-gray-300"
          >
            투자의견
            <span className="ml-1 font-normal text-gray-500">(선택)</span>
          </label>
          <textarea
            id="investment-opinion"
            value={investmentOpinion}
            onChange={(e) => {
              setInvestmentOpinion(e.target.value);
              setAnalysis(null);
            }}
            placeholder="예: 연준 금리 인하 기대에 수혜받는 빅테크 장기 보유 관점. AI 인프라 투자 확대와 CPI 둔화 시 실적 개선 기대..."
            rows={4}
            className="w-full resize-none rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm text-white placeholder:text-neutral focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
          <p className="mt-1.5 text-[10px] text-gray-500">
            입력한 의견을 AI가 참고하여 분석합니다.
          </p>
        </div>

        {watchlist.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs text-gray-400">관심종목 빠른 선택</p>
            <div className="flex flex-wrap gap-2">
              {watchlist.map((item) => (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => handleChipSelect(item.ticker, item.name)}
                  className={`rounded-lg border px-4 py-2 font-mono text-sm font-semibold transition-colors ${
                    selected?.ticker === item.ticker
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-surface-border text-gray-400 hover:text-white hover:border-surface-border/80"
                  }`}
                >
                  {item.ticker}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isLoading || !selected}
          className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "AI 분석 중... (10~30초)" : "분석 시작"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-bearish/30 bg-bearish/10 px-4 py-3 text-sm text-bearish">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-surface-border bg-surface-card"
            />
          ))}
        </div>
      )}

      {analysis && !isLoading && <AnalysisSections analysis={analysis} />}
    </div>
  );
}
