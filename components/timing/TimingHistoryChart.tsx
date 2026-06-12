"use client";

import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimingHistoryPeriod, TimingHistoryPoint } from "@/lib/timing/types";

interface TimingHistoryChartProps {
  ticker: string;
}

export default function TimingHistoryChart({ ticker }: TimingHistoryChartProps) {
  const [period, setPeriod] = useState<TimingHistoryPeriod>("6m");
  const [data, setData] = useState<TimingHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/timing/${encodeURIComponent(ticker)}?history=${period}`,
      { cache: "no-store" }
    )
      .then((res) => res.json())
      .then((json) => setData(json.history ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [ticker, period]);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-300">진입 점수 히스토리</p>
        <div className="flex gap-1">
          {(["6m", "1y"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${
                period === p
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "text-neutral border border-surface-border"
              }`}
            >
              {p === "6m" ? "6개월" : "1년"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-44">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral">
            로딩 중...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral">
            히스토리 데이터가 없습니다.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tick={{ fill: "#8b949e", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[40, 100]}
                tick={{ fill: "#8b949e", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "#1c2128",
                  border: "1px solid #30363d",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(v) => [`${Number(v ?? 0)}점`, "진입 점수"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#f0b429"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
