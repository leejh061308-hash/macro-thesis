import { formatDate } from "@/lib/format";
import type { NewsItem } from "@/lib/types";

interface NewsCardProps {
  item: NewsItem;
}

export default function NewsCard({ item }: NewsCardProps) {
  const isPending = item.summaryPending && !item.summary;

  return (
    <article className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <h3 className="mb-2 text-base font-semibold leading-snug text-white">
        {item.title}
      </h3>

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400">
          Source: <span className="text-gray-300">{item.source}</span>
        </span>
        <time className="shrink-0 text-xs text-gray-400 font-mono">
          {formatDate(item.publishedAt)}
        </time>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs font-medium text-accent">뉴스 요약</p>
        {isPending ? (
          <p className="text-sm text-gray-400 animate-pulse">요약 생성 중...</p>
        ) : (
          <p className="text-sm leading-relaxed text-gray-200">{item.summary}</p>
        )}
      </div>

      {!isPending && item.marketImpact && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-bullish">시장 영향</p>
          <p className="text-sm leading-relaxed text-gray-300">
            {item.marketImpact}
          </p>
        </div>
      )}

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-lg border border-surface-border px-4 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-accent/40 hover:text-accent"
      >
        원문 보기
      </a>
    </article>
  );
}
