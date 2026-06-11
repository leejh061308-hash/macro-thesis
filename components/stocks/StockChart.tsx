"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartYAxis } from "@/lib/market-quote";
import { normalizeTicker } from "@/lib/tickers";
import type { ChartDataPoint, ChartPeriod } from "@/lib/types";

const PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: "1d", label: "1일" },
  { value: "1w", label: "1주" },
  { value: "1m", label: "1개월" },
  { value: "1y", label: "1년" },
];

interface StockChartProps {
  ticker: string;
}

export default function StockChart({ ticker: rawTicker }: StockChartProps) {
  const ticker = normalizeTicker(rawTicker);
  const gradientId = useId().replace(/:/g, "");
  const [period, setPeriod] = useState<ChartPeriod>("1m");
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/stocks/${encodeURIComponent(ticker)}/chart?period=${period}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json) => setData(json.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [ticker, period]);

  const prices = useMemo(() => data.map((d) => d.close), [data]);

  const yDomain = useMemo(() => {
    if (prices.length === 0) return ["auto", "auto"] as const;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = Math.max((max - min) * 0.08, 0.5);
    return [min - padding, max + padding] as const;
  }, [prices]);

  const isPositive =
    data.length >= 2 ? data[data.length - 1].close >= data[0].close : true;
  const strokeColor = isPositive ? "#3fb950" : "#f85149";

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <div className="mb-4 flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === p.value
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-neutral border border-surface-border hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="h-56">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral">
            차트 로딩 중...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral">
            차트 데이터가 없습니다.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "#8b949e", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                domain={yDomain}
                tick={{ fill: "#8b949e", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(v: number) => formatChartYAxis(v, prices)}
              />
              <Tooltip
                contentStyle={{
                  background: "#1c2128",
                  border: "1px solid #30363d",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#8b949e" }}
                itemStyle={{ color: "#f0b429" }}
                formatter={(value) => [
                  `$${Number(value ?? 0).toFixed(2)}`,
                  "종가",
                ]}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
