"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BacktestPoint } from "@/lib/quant/types";

interface BacktestChartProps {
  data: BacktestPoint[];
  strategyName: string;
}

export default function BacktestChart({
  data,
  strategyName,
}: BacktestChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-neutral">
        차트 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#8b949e", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            tick={{ fill: "#8b949e", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#1c2128",
              border: "1px solid #30363d",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value, name) => [
              `${Number(value ?? 0).toFixed(1)}%`,
              name === "strategyReturn" ? strategyName : "S&P500",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#8b949e" }}
            formatter={(value) =>
              value === "strategyReturn" ? strategyName : "S&P500 (SPY)"
            }
          />
          <Line
            type="monotone"
            dataKey="strategyReturn"
            stroke="#f0b429"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="benchmarkReturn"
            stroke="#8b949e"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
