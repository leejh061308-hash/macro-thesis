"use client";

interface QuantOnboardingProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: "MacroLens 퀀트란?",
    body: "8가지 투자 스타일(성장·가치·배당 등)별로 종목 순위, 진입 환경, 백테스트를 한곳에서 확인하는 리서치 도구입니다.",
  },
  {
    title: "점수의 의미",
    body: "전략 적합도·진입 점수·기업 점수는 유니버스 내 상대 순위와 환경 지표입니다. 높다고 해서 매수 신호가 아닙니다.",
  },
  {
    title: "데이터 한계",
    body: "Finnhub·Yahoo Finance 데이터를 사용하며, 지연·누락·오차가 있을 수 있습니다. 백테스트는 과거 시뮬레이션일 뿐 미래 수익을 보장하지 않습니다.",
  },
  {
    title: "투자 책임",
    body: "본 서비스는 투자 조언·매매 추천이 아닙니다. 모든 투자 판단과 결과는 사용자 본인의 책임입니다.",
  },
] as const;

export default function QuantOnboarding({ open, onClose }: QuantOnboardingProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-raised p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <h2 id="onboarding-title" className="text-base font-bold text-white">
          퀀트 기능 안내
        </h2>
        <p className="mt-1 text-xs text-neutral">
          처음 사용하시나요? 30초만 읽어 주세요.
        </p>

        <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-lg border border-surface-border bg-surface-card px-3 py-2.5"
            >
              <p className="text-xs font-semibold text-accent">{section.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-surface-base"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
}
