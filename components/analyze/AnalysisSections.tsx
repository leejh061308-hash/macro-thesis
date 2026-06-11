import AiDisclaimer from "@/components/layout/AiDisclaimer";
import type { StockAnalysis } from "@/lib/types";

interface AnalysisSectionsProps {
  analysis: StockAnalysis;
}

function Section({
  title,
  number,
  children,
}: {
  title: string;
  number: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/10 font-mono text-xs">
          {number}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function AnalysisSections({ analysis }: AnalysisSectionsProps) {
  const hasOpinionReview =
    analysis.userOpinionReview && analysis.userOpinionReview.length > 0;

  let sectionNum = 1;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
        <p className="font-mono text-lg font-bold text-white">
          {analysis.ticker}
        </p>
        <p className="text-sm text-neutral">{analysis.name}</p>
      </div>

      <Section title="기업 요약" number={sectionNum++}>
        <p className="text-sm leading-relaxed text-gray-300">
          {analysis.companySummary}
        </p>
      </Section>

      {hasOpinionReview && (
        <Section title="투자의견 검토" number={sectionNum++}>
          {analysis.userOpinion && (
            <blockquote className="mb-3 border-l-2 border-accent/40 pl-3 text-sm italic text-gray-400">
              {analysis.userOpinion}
            </blockquote>
          )}
          <p className="text-sm leading-relaxed text-gray-300">
            {analysis.userOpinionReview}
          </p>
        </Section>
      )}

      <Section title="투자 포인트" number={sectionNum++}>
        <ul className="space-y-2">
          {analysis.investmentPoints.map((point, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-relaxed text-gray-300"
            >
              <span className="text-bullish shrink-0">+</span>
              {point}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="리스크" number={sectionNum++}>
        <ul className="space-y-2">
          {analysis.risks.map((risk, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-relaxed text-gray-300"
            >
              <span className="text-bearish shrink-0">−</span>
              {risk}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="매크로 영향" number={sectionNum++}>
        <p className="text-sm leading-relaxed text-gray-300">
          {analysis.macroImpact}
        </p>
      </Section>

      <Section title="핵심 체크 지표" number={sectionNum++}>
        <ul className="space-y-2">
          {analysis.keyIndicators.map((indicator, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-sm text-gray-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              {indicator}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="종합 의견" number={sectionNum++}>
        <p className="text-sm leading-relaxed text-gray-300">
          {analysis.overallOpinion}
        </p>
        <AiDisclaimer className="mt-3 border-t border-surface-border pt-3" />
      </Section>
    </div>
  );
}
