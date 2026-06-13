import {
  AI_DISCLAIMER,
  BACKTEST_DISCLAIMER,
  DATA_SOURCE_NOTE,
  QUANT_DISCLAIMER,
} from "@/lib/constants";

type DisclaimerVariant = "quant" | "backtest" | "timing" | "ai" | "full";

const VARIANT_LINES: Record<DisclaimerVariant, string[]> = {
  ai: [AI_DISCLAIMER],
  quant: [QUANT_DISCLAIMER, DATA_SOURCE_NOTE],
  timing: [QUANT_DISCLAIMER, "진입 점수는 기술적·밸류에이션 지표의 종합이며, 단기 매매 신호가 아닙니다."],
  backtest: [BACKTEST_DISCLAIMER, DATA_SOURCE_NOTE],
  full: [QUANT_DISCLAIMER, BACKTEST_DISCLAIMER, AI_DISCLAIMER, DATA_SOURCE_NOTE],
};

interface ResearchDisclaimerProps {
  variant?: DisclaimerVariant;
  className?: string;
}

export default function ResearchDisclaimer({
  variant = "quant",
  className = "",
}: ResearchDisclaimerProps) {
  const lines = VARIANT_LINES[variant];

  return (
    <div
      className={`rounded-lg border border-surface-border/80 bg-surface-card/50 px-3 py-2.5 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        참고용 리서치 도구
      </p>
      <ul className="mt-1.5 space-y-1">
        {lines.map((line) => (
          <li key={line} className="text-[10px] leading-relaxed text-gray-500">
            · {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
