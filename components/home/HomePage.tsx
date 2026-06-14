"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import WarmupTrigger from "@/components/quant/WarmupTrigger";
import StrategyScrollSection from "@/components/home/StrategyScrollSection";
import TodaysOpportunities from "@/components/timing/TodaysOpportunities";
import RecommendedStocks from "@/components/home/RecommendedStocks";
import MarketSummary from "@/components/home/MarketSummary";

export default function HomePage() {
  const [greeting, setGreeting] = useState("투자 인사이트");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("좋은 아침이에요");
    else if (hour < 18) setGreeting("오늘의 시장 흐름");
    else setGreeting("오늘의 투자 인사이트");
  }, []);

  return (
    <div className="space-y-6 pb-2 animate-stagger">
      <WarmupTrigger />

      <section className="animate-slide-up">
        <p className="text-sm text-muted">{greeting}</p>
        <h2 className="mt-1 text-xl font-bold text-text">
          지금 유리한 전략을 확인하세요
        </h2>
        <p className="mt-1 text-xs text-muted">
          복잡한 차트 대신, AI가 정리한 핵심만 보여드립니다
        </p>
      </section>

      <StrategyScrollSection />

      <TodaysOpportunities variant="home" />

      <RecommendedStocks />

      <MarketSummary />

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
