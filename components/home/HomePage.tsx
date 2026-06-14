"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import WarmupTrigger from "@/components/quant/WarmupTrigger";
import StrategyAtAGlance from "@/components/home/StrategyAtAGlance";
import TodaysOpportunities, {
  fetchOpportunities,
} from "@/components/timing/TodaysOpportunities";
import RecommendedStocks from "@/components/home/RecommendedStocks";
import MarketSummary from "@/components/home/MarketSummary";
import type { StrategyOverviewItem } from "@/lib/quant/strategy-overview";
import type { StrategyResult } from "@/lib/quant/types";
import type { TimingOpportunity } from "@/lib/timing/types";

interface HomeData {
  strategies: StrategyOverviewItem[];
  topStrategy: { id: string; shortName: string } | null;
  recommended: StrategyResult[];
  marketSummary: string;
  topStrategies: StrategyOverviewItem[];
  warming?: boolean;
}

export default function HomePage() {
  const [greeting, setGreeting] = useState("투자 인사이트");
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<TimingOpportunity[]>([]);
  const [oppLoading, setOppLoading] = useState(true);
  const [oppError, setOppError] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("좋은 아침이에요");
    else if (hour < 18) setGreeting("오늘의 시장 흐름");
    else setGreeting("오늘의 투자 인사이트");
  }, []);

  const loadOpportunities = useCallback(async (signal?: AbortSignal) => {
    setOppLoading(true);
    setOppError(null);
    try {
      const items = await fetchOpportunities(signal);
      setOpportunities(items);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setOpportunities([]);
      setOppError("오늘의 기회를 불러오지 못했습니다.");
    } finally {
      setOppLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function loadHome() {
      try {
        const res = await fetch("/api/home", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setData(json as HomeData);
        setError(null);

        if (json.warming) {
          if (!pollTimer) {
            pollTimer = setInterval(() => void loadHome(), 5000);
          }
        } else if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      } catch (e) {
        if (cancelled) return;
        setError("데이터를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHome();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    void loadOpportunities(controller.signal);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [loadOpportunities]);

  return (
    <div className="space-y-6 pb-2">
      <WarmupTrigger />

      <section>
        <p className="text-sm text-muted">{greeting}</p>
        <h2 className="mt-1 text-xl font-bold text-text">
          지금 유리한 전략을 확인하세요
        </h2>
      </section>

      {error && (
        <Card padding="md">
          <p className="text-sm text-bearish">{error}</p>
        </Card>
      )}

      <StrategyAtAGlance
        strategies={data?.strategies ?? []}
        loading={loading && !data}
        warming={Boolean(data?.warming)}
      />

      <TodaysOpportunities
        variant="home"
        items={opportunities}
        loading={oppLoading}
        error={oppError}
        onRetry={() => loadOpportunities()}
      />

      <RecommendedStocks
        stocks={data?.recommended ?? []}
        topStrategy={data?.topStrategy?.shortName ?? ""}
        loading={loading && !data}
      />

      <MarketSummary
        summary={data?.marketSummary ?? ""}
        topStrategies={data?.topStrategies ?? []}
        loading={loading && !data}
      />

      <Card interactive padding="md" className="text-center">
        <p className="text-sm text-text-secondary">더 깊은 분석이 필요하신가요?</p>
        <div className="mt-3 flex justify-center gap-2">
          <Link
            href="/quant"
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            퀀트 분석
          </Link>
          <Link
            href="/analyze"
            className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-white/10"
          >
            AI 종목 분석
          </Link>
        </div>
      </Card>
    </div>
  );
}
