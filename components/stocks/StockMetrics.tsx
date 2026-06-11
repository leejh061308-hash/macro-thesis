import {
  formatChange,
  formatLargeNumber,
  formatPercent,
  formatPrice,
  formatRatio,
} from "@/lib/format";
import { getStockHeadline } from "@/lib/stock-display";
import type { StockDetail } from "@/lib/types";

interface StockMetricsProps {
  detail: StockDetail;
}

const METRICS: {
  label: string;
  getValue: (d: StockDetail) => string;
}[] = [
  { label: "현재가", getValue: (d) => formatPrice(d.price, d.currency) },
  { label: "시가총액", getValue: (d) => formatLargeNumber(d.marketCap) },
  { label: "PER", getValue: (d) => formatRatio(d.peRatio) },
  { label: "PBR", getValue: (d) => formatRatio(d.pbRatio) },
  { label: "ROE", getValue: (d) => formatPercent(d.roe) },
  { label: "매출", getValue: (d) => formatLargeNumber(d.revenue) },
  { label: "순이익", getValue: (d) => formatLargeNumber(d.netIncome) },
  { label: "부채비율", getValue: (d) => formatRatio(d.debtToEquity) },
  { label: "배당수익률", getValue: (d) => formatPercent(d.dividendYield) },
  {
    label: "52주 최고가",
    getValue: (d) =>
      d.fiftyTwoWeekHigh
        ? formatPrice(d.fiftyTwoWeekHigh, d.currency)
        : "—",
  },
  {
    label: "52주 최저가",
    getValue: (d) =>
      d.fiftyTwoWeekLow
        ? formatPrice(d.fiftyTwoWeekLow, d.currency)
        : "—",
  },
];

export default function StockMetrics({ detail }: StockMetricsProps) {
  const isPositive = detail.changePercent >= 0;
  const { primary, secondary } = getStockHeadline(detail.ticker, detail.name);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{primary}</h2>
            {secondary ? (
              <p className="text-sm text-neutral">{secondary}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-white">
              {formatPrice(detail.price, detail.currency)}
            </p>
            <p
              className={`font-mono text-sm ${
                isPositive ? "text-bullish" : "text-bearish"
              }`}
            >
              {formatChange(detail.change, detail.changePercent)}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              정규장(본장) 기준 · 장외마켓 미반영
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {METRICS.slice(1).map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-surface-border bg-surface-card px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-neutral">
              {metric.label}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-white">
              {metric.getValue(detail)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
