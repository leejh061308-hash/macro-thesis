"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BacktestStatsGrid from "./BacktestStatsGrid";
import type { CompareResult } from "@/lib/quant/types";

interface ComparePanelProps {
  result: CompareResult;
  onClose: () => void;
}

export default function ComparePanel({ result, onClose }: ComparePanelProps) {
  const chartData = result.strategies.map((s) => ({
    name: s.name.replace(" 전략", ""),
    return: s.stats.totalReturn,
    cagr: s.stats.cagr,
    mdd: Math.abs(s.stats.mdd),
    sharpe: s.stats.sharpe,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-surface-border bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">전략 비교</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral hover:text-white"
          >
            닫기
          </button>
        </div>

        <div className="mb-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#8b949e", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8b949e", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "#1c2128",
                  border: "1px solid #30363d",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, "누적 수익률"]}
              />
              <Bar dataKey="return" fill="#f0b429" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          {result.strategies.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-surface-border bg-surface-card p-3"
            >
              <h4 className="mb-2 text-sm font-semibold text-white">{s.name}</h4>
              <BacktestStatsGrid stats={s.stats} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
