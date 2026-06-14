import QuantPageClient from "@/components/quant/QuantPageClient";
import ResearchDisclaimer from "@/components/layout/ResearchDisclaimer";
import WarmupTrigger from "@/components/quant/WarmupTrigger";

export default function QuantPage() {
  return (
    <div className="space-y-4">
      <WarmupTrigger />

      <div>
        <h2 className="text-xl font-bold text-text">퀀트 분석</h2>
        <p className="text-xs text-muted">
          AI가 정리한 전략 · 순위 · 백테스트
        </p>
      </div>

      <QuantPageClient />

      <ResearchDisclaimer variant="quant" />
    </div>
  );
}
