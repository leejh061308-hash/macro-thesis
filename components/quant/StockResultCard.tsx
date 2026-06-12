"use client";

import Link from "next/link";
import type { StrategyResult } from "@/lib/quant/types";

interface StockResultCardProps {
  item: StrategyResult;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function StockResultCard({
  item,
  isFavorite,
  onToggleFavorite,
}: StockResultCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {item.rank > 0 && (
            <span className="text-[10px] font-mono text-neutral">
              #{item.rank}
            </span>
          )}
          <Link
            href={`/stocks/${encodeURIComponent(item.ticker)}`}
            className="block truncate text-sm font-semibold text-white hover:text-accent"
          >
            {item.name}
          </Link>
          <p className="text-[11px] text-neutral">{item.ticker}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
            {item.score}점
          </span>
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
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-surface-border px-2 py-0.5 text-[10px] text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
