import { formatDate } from "@/lib/format";
import type { MainNewsItem } from "@/lib/types";

interface OfficialNewsCardProps {
  item: MainNewsItem;
  canManage?: boolean;
  onEdit?: (item: MainNewsItem) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

export default function OfficialNewsCard({
  item,
  canManage = false,
  onEdit,
  onDelete,
  isDeleting = false,
}: OfficialNewsCardProps) {
  return (
    <article className="rounded-xl border border-accent/30 bg-accent/5 p-4 card-glow">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="inline-block rounded border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          메인
        </span>
        <time className="shrink-0 text-xs text-gray-400 font-mono">
          {formatDate(item.publishedAt)}
        </time>
      </div>

      <h3 className="mb-3 text-base font-semibold leading-snug text-white">
        {item.title}
      </h3>

      <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
        {item.summary}
      </div>

      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex text-xs text-accent hover:underline"
        >
          원문 보기 →
        </a>
      )}

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

      {canManage && (
        <div className="mt-4 flex gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="flex-1 rounded-lg border border-surface-border py-2 text-sm text-gray-300 transition-colors hover:border-accent/40 hover:text-accent"
            >
              수정
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              disabled={isDeleting}
              aria-label={`${item.title} 삭제`}
              className="flex-1 rounded-lg border border-bearish/30 py-2 text-sm text-bearish transition-colors hover:bg-bearish/10 disabled:opacity-50"
            >
              {isDeleting ? "삭제 중…" : "삭제"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
