"use client";

import Link from "next/link";
import { formatChange, formatPrice } from "@/lib/format";
import { getStockHeadline } from "@/lib/stock-display";
import type { StockQuote } from "@/lib/types";
import Card from "@/components/ui/Card";

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
    <div className="flex items-stretch overflow-hidden rounded-card shadow-card transition-all hover:shadow-card-hover">
      <Link
        href={`/stocks/${encodeURIComponent(stock.ticker)}`}
        className="block min-w-0 flex-1"
      >
        <Card padding="md" className="rounded-none shadow-none hover:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-text">{primary}</h3>
              {secondary && (
                <p className="truncate text-xs text-muted">{secondary}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-semibold text-text">
                {formatPrice(stock.price, stock.currency)}
              </p>
              <p
                className={`text-sm font-medium ${
                  isPositive ? "text-bullish" : "text-bearish"
                }`}
              >
                {formatChange(stock.change, stock.changePercent)}
              </p>
            </div>
          </div>
        </Card>
      </Link>

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(stock.ticker)}
          disabled={isRemoving}
          aria-label={`${primary} 관심종목에서 삭제`}
          className="flex w-11 shrink-0 items-center justify-center bg-surface-card text-muted transition-colors hover:bg-bearish/10 hover:text-bearish disabled:opacity-50"
        >
          {isRemoving ? "…" : "×"}
        </button>
      )}
    </div>
  );
}
