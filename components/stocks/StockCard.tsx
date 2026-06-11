"use client";

import Link from "next/link";
import { formatChange, formatPrice } from "@/lib/format";
import { getStockHeadline } from "@/lib/stock-display";
import type { StockQuote } from "@/lib/types";

interface StockCardProps {
  stock: StockQuote;
  onRemove?: (ticker: string) => void;
  isRemoving?: boolean;
}

export default function StockCard({
  stock,
  onRemove,
  isRemoving = false,
}: StockCardProps) {
  const isPositive = stock.changePercent >= 0;
  const { primary, secondary } = getStockHeadline(stock.ticker, stock.name);

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-surface-border bg-surface-card card-glow transition-colors hover:border-accent/30">
      <Link
        href={`/stocks/${encodeURIComponent(stock.ticker)}`}
        className="block min-w-0 flex-1 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white">{primary}</h3>
            {secondary ? (
              <p className="truncate text-xs text-neutral">{secondary}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-lg font-semibold text-white">
              {formatPrice(stock.price, stock.currency)}
            </p>
            <p
              className={`font-mono text-sm ${
                isPositive ? "text-bullish" : "text-bearish"
              }`}
            >
              {formatChange(stock.change, stock.changePercent)}
            </p>
          </div>
        </div>
      </Link>

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(stock.ticker)}
          disabled={isRemoving}
          aria-label={`${primary} 관심종목에서 삭제`}
          className="flex w-12 shrink-0 items-center justify-center border-l border-surface-border text-gray-500 transition-colors hover:bg-bearish/10 hover:text-bearish disabled:opacity-50"
        >
          {isRemoving ? "…" : "×"}
        </button>
      )}
    </div>
  );
}
