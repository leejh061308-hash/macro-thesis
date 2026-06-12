"use client";

import Link from "next/link";
import type { ScreenerResult } from "@/lib/screener/types";

interface ScreenerResultCardProps {
  item: ScreenerResult;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(price);
}

export default function ScreenerResultCard({
  item,
  isFavorite,
  onToggleFavorite,
}: ScreenerResultCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {item.rank > 0 && (
            <span className="text-[10px] font-mono text-neutral">#{item.rank}</span>
          )}
          <Link
            href={`/stocks/${encodeURIComponent(item.ticker)}`}
            className="block truncate text-sm font-semibold text-white hover:text-accent"
          >
            {item.name}
          </Link>
          <p className="text-[11px] text-neutral">{item.ticker}</p>
          <p className="mt-1 text-xs text-gray-300">{formatPrice(item.price, item.currency)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex flex-wrap justify-end gap-1">
            {item.strategyScore != null && (
              <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                전략 {item.strategyScore}
              </span>
            )}
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              기업 {item.companyScore}
            </span>
            {item.timingScore != null && (
              <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-400">
                진입 {item.timingScore}
              </span>
            )}
          </div>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`text-sm ${isFavorite ? "text-accent" : "text-neutral"}`}
              aria-label="즐겨찾기"
            >
              {isFavorite ? "★" : "☆"}
            </button>
          )}
        </div>
      </div>

      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {item.reasons.length > 0 && (
        <div className="mt-3 rounded-lg border border-surface-border/80 bg-surface/50 px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-400">선정 이유</p>
          <ul className="mt-1 space-y-0.5">
            {item.reasons.map((reason) => (
              <li key={reason} className="text-[11px] text-gray-300">
                · {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
