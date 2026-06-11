import Link from "next/link";
import { formatChange, formatPrice } from "@/lib/format";
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

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-surface-border bg-surface-card card-glow transition-colors hover:border-accent/30">
      <Link
        href={`/stocks/${encodeURIComponent(stock.ticker)}`}
        className="block min-w-0 flex-1 p-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-mono text-lg font-bold text-white">
              {stock.ticker}
            </h3>
            <p className="text-xs text-neutral truncate max-w-[180px]">
              {stock.name}
            </p>
          </div>
          <div className="text-right">
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
          aria-label={`${stock.ticker} 관심종목에서 삭제`}
          className="flex w-12 shrink-0 items-center justify-center border-l border-surface-border text-gray-500 transition-colors hover:bg-bearish/10 hover:text-bearish disabled:opacity-50"
        >
          {isRemoving ? "…" : "×"}
        </button>
      )}
    </div>
  );
}
