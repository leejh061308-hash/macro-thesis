import {
  formatChange,
  formatLargeNumber,
  formatPercent,
  formatPrice,
  formatRatio,
} from "@/lib/format";
import { getStockHeadline } from "@/lib/stock-display";
import type { StockDetail } from "@/lib/types";
import Card from "@/components/ui/Card";

interface StockMetricsProps {
  detail: StockDetail;
}

const KEY_METRICS: {
  label: string;
  getValue: (d: StockDetail) => string;
}[] = [
  { label: "시가총액", getValue: (d) => formatLargeNumber(d.marketCap) },
  { label: "PER", getValue: (d) => formatRatio(d.peRatio) },
  { label: "PBR", getValue: (d) => formatRatio(d.pbRatio) },
  { label: "ROE", getValue: (d) => formatPercent(d.roe) },
  { label: "배당수익률", getValue: (d) => formatPercent(d.dividendYield) },
  { label: "52주 고가", getValue: (d) => d.fiftyTwoWeekHigh ? formatPrice(d.fiftyTwoWeekHigh, d.currency) : "—" },
];

export default function StockMetrics({ detail }: StockMetricsProps) {
  const isPositive = detail.changePercent >= 0;
  const { primary, secondary } = getStockHeadline(detail.ticker, detail.name);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text">{primary}</h2>
            {secondary && (
              <p className="mt-0.5 text-sm text-muted">{secondary}</p>
            )}
            <p className="mt-1 font-mono text-xs text-muted">{detail.ticker}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-text">
              {formatPrice(detail.price, detail.currency)}
            </p>
            <p
              className={`mt-0.5 text-sm font-medium ${
                isPositive ? "text-bullish" : "text-bearish"
              }`}
            >
              {formatChange(detail.change, detail.changePercent)}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {KEY_METRICS.map((metric) => (
          <Card key={metric.label} padding="sm" className="text-center">
            <p className="text-[10px] text-muted">{metric.label}</p>
            <p className="mt-1 text-sm font-semibold text-text">
              {metric.getValue(detail)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
