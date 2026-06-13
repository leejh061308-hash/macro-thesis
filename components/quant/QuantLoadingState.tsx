"use client";

import { useEffect, useState } from "react";
import { QUANT_WARMUP_HINT } from "@/lib/constants";

const STEPS = [
  "종목 유니버스 불러오는 중…",
  "재무·모멘텀 데이터 수집 중…",
  "전략 적합도 계산 중…",
  "진입 환경 분석 중…",
] as const;

const TIPS = [
  "전략 적합도는 현재 시장에서 해당 스타일이 얼마나 유리한지 보여줍니다.",
  "진입 점수는 추천 종목의 매수 타이밍이 아니라 환경 지표입니다.",
  "점수는 유니버스 내 상대 순위이며, 절대적 우열을 의미하지 않습니다.",
] as const;

interface QuantLoadingStateProps {
  label?: string;
}

export default function QuantLoadingState({
  label = "퀀트 데이터 준비 중",
}: QuantLoadingStateProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 4000);
    const tipTimer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 6000);
    const elapsedTimer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(stepTimer);
      clearInterval(tipTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-accent">{STEPS[stepIndex]}</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-border/50">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-accent/60" />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-neutral">{QUANT_WARMUP_HINT}</p>
      <p className="mt-2 text-[10px] text-gray-500">
        {elapsed > 0 ? `${elapsed}초 경과 · ` : ""}
        {TIPS[tipIndex]}
      </p>
    </div>
  );
}
