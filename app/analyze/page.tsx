import AnalyzePanel from "@/components/analyze/AnalyzePanel";
import AiDisclaimer from "@/components/layout/AiDisclaimer";

export default function AnalyzePage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">AI 분석</h2>
        <p className="text-xs text-gray-400">
          종목 선택 + 투자의견 입력 · AI 매크로 리서치 (매수/매도 추천 없음)
        </p>
        <AiDisclaimer className="mt-1.5" />
      </div>
      <AnalyzePanel />
    </div>
  );
}
