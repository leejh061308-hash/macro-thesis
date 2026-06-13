import QuantPageClient from "@/components/quant/QuantPageClient";
import ResearchDisclaimer from "@/components/layout/ResearchDisclaimer";
import WarmupTrigger from "@/components/quant/WarmupTrigger";

export default function QuantPage() {
  return (
    <div className="space-y-4">
      <WarmupTrigger />

      <div>
        <h2 className="text-lg font-bold text-white">AI 투자</h2>
        <p className="text-xs text-gray-400">
          전략 · 순위 · 진입 환경 · 백테스트 · AI 해석
        </p>
      </div>

      <ResearchDisclaimer variant="quant" />

      <QuantPageClient />
    </div>
  );
}
