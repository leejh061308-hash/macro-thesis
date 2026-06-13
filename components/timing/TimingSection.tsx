"use client";

import { useEffect, useState } from "react";
import ScoreCards from "./ScoreCards";
import TimingHistoryChart from "./TimingHistoryChart";
import TimingPanel from "./TimingPanel";
import type { TimingScoreResult } from "@/lib/timing/types";

interface TimingSectionProps {
  ticker: string;
}

export default function TimingSection({ ticker }: TimingSectionProps) {
  const [timing, setTiming] = useState<TimingScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/timing/${encodeURIComponent(ticker)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTiming(data.timing);
      })
      .catch((e) => {
        setTiming(null);
        setError(e instanceof Error ? e.message : "로드 실패");
      })
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-xl bg-surface-border/40" />
          <div className="h-28 rounded-xl bg-surface-border/40" />
        </div>
      </div>
    );
  }

  if (error || !timing) {
    return (
      <div className="rounded-lg border border-surface-border px-3 py-2 text-xs text-neutral">
        {error ?? "진입 점수를 불러올 수 없습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScoreCards timing={timing} />
      <TimingPanel ticker={ticker} timing={timing} showBreakdown={false} />
      <TimingHistoryChart ticker={ticker} />
    </div>
  );
}
