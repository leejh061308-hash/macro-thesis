import QuantPanel from "@/components/quant/QuantPanel";
import AiDisclaimer from "@/components/layout/AiDisclaimer";

export default function QuantPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">AI 투자</h2>
        <p className="text-xs text-gray-400">
          전략 · 추천 종목 · 진입 점수 · AI 해석
        </p>
        <AiDisclaimer className="mt-1.5" />
      </div>
      <QuantPanel />
    </div>
  );
}
