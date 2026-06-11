import Link from "next/link";
import StockChart from "@/components/stocks/StockChart";
import { getIndexName } from "@/lib/tickers";

interface IndexChartViewProps {
  ticker: string;
}

export default function IndexChartView({ ticker }: IndexChartViewProps) {
  const name = getIndexName(ticker);

  return (
    <div className="space-y-4">
      <Link
        href="/stocks"
        className="inline-flex items-center gap-1 text-xs text-neutral hover:text-accent transition-colors"
      >
        ← 관심종목
      </Link>

      <div className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">지수</p>
        <h2 className="mt-1 text-xl font-bold text-white">{name}</h2>
        <p className="mt-2 text-[11px] text-gray-500">
          정규장(본장) 기준 · 장외마켓 미반영
        </p>
      </div>

      <StockChart ticker={ticker} />
    </div>
  );
}
