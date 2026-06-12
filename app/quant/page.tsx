import QuantPanel from "@/components/quant/QuantPanel";
import AiDisclaimer from "@/components/layout/AiDisclaimer";

export default function QuantPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">퀀트 전략</h2>
        <p className="text-xs text-gray-400">
          검증된 전략 선택 · 백테스트 · 종목 스크리닝
        </p>
        <AiDisclaimer className="mt-1.5" />
      </div>
      <QuantPanel />
    </div>
  );
}
