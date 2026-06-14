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

const LINE_LABELS: Record<string, string> = {
  strategyReturn: "전략",
  benchmarkReturn: "S&P500",
  nasdaqReturn: "Nasdaq100",
};

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
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#1E293B",
              border: "none",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            formatter={(value, name) => {
              const key = String(name);
              const label =
                key === "strategyReturn" ? strategyName : LINE_LABELS[key] ?? key;
              return [`${Number(value ?? 0).toFixed(1)}%`, label];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "10px", color: "#94A3B8" }}
            formatter={(value) => {
              if (value === "strategyReturn") return strategyName;
              return LINE_LABELS[value] ?? value;
            }}
          />
          <Line
            type="monotone"
            dataKey="strategyReturn"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="benchmarkReturn"
            stroke="#94A3B8"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="nasdaqReturn"
            stroke="#8B5CF6"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="2 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
