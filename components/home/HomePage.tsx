"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import WarmupTrigger from "@/components/quant/WarmupTrigger";
import StrategyAtAGlance from "@/components/home/StrategyAtAGlance";
import TodaysOpportunities from "@/components/timing/TodaysOpportunities";
import RecommendedStocks from "@/components/home/RecommendedStocks";
import MarketSummary from "@/components/home/MarketSummary";
import type { StrategyOverviewItem } from "@/lib/quant/strategy-overview";
import type { StrategyResult } from "@/lib/quant/types";

interface HomeData {
  strategies: StrategyOverviewItem[];
  topStrategy: { id: string; shortName: string } | null;
  recommended: StrategyResult[];
  marketSummary: string;
  topStrategies: StrategyOverviewItem[];
}

export default function HomePage() {
  const [greeting, setGreeting] = useState("투자 인사이트");
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("좋은 아침이에요");
    else if (hour < 18) setGreeting("오늘의 시장 흐름");
    else setGreeting("오늘의 투자 인사이트");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    fetch("/api/home", { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json as HomeData);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") {
          setError("로딩 시간이 초과되었습니다. 새로고침해 주세요.");
        } else {
          setError("데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timeout);
      });

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

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
        loading={loading}
      />

      <TodaysOpportunities variant="home" />

      <RecommendedStocks
        stocks={data?.recommended ?? []}
        topStrategy={data?.topStrategy?.shortName ?? ""}
        loading={loading}
      />

      <MarketSummary
        summary={data?.marketSummary ?? ""}
        topStrategies={data?.topStrategies ?? []}
        loading={loading}
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
