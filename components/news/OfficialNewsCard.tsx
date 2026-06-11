import { formatDate } from "@/lib/format";
import type { OfficialNewsItem } from "@/lib/types";

interface OfficialNewsCardProps {
  item: OfficialNewsItem;
}

export default function OfficialNewsCard({ item }: OfficialNewsCardProps) {
  return (
    <article className="rounded-xl border border-accent/30 bg-accent/5 p-4 card-glow">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="inline-block rounded border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            메인
          </span>
          {item.eventType && (
            <span className="ml-2 text-[10px] text-gray-400">
              {item.eventType}
            </span>
          )}
        </div>
        <time className="shrink-0 text-xs text-gray-400 font-mono">
          {formatDate(item.publishedAt)}
        </time>
      </div>

      <h3 className="mb-3 text-base font-semibold leading-snug text-white">
        {item.title}
      </h3>

      <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
        {item.content}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card/80 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-accent">AI 매크로 분석</p>
        {item.aiAnalysisPending && !item.aiAnalysis ? (
          <p className="text-sm text-gray-400 animate-pulse">
            AI 분석 생성 중...
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-gray-200">
            {item.aiAnalysis}
          </p>
        )}
      </div>
    </article>
  );
}
