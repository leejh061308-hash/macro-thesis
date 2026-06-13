"use client";

import { useState } from "react";
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
import ResearchDisclaimer from "@/components/layout/ResearchDisclaimer";
import { BASIC_STYLE_STRATEGY_IDS } from "@/lib/quant/constants";
import type { BacktestPeriod, CompareResult, StrategyId } from "@/lib/quant/types";

const STRATEGY_LABELS: Record<StrategyId, string> = {
  value: "가치주 전략",
  growth: "성장주 전략",
  dividend: "배당주 전략",
  "quality-factor": "퀄리티 전략",
  momentum: "모멘텀 전략",
  garp: "GARP 전략",
  buffett: "버핏 전략",
  moat: "경제적 해자 전략",
  defensive: "방어주 전략",
  "ai-beneficiary": "AI 수혜주 전략",
  datacenter: "데이터센터 전략",
  "power-infra": "전력 인프라 전략",
  "rate-hike": "금리 인상 수혜 전략",
  "rate-cut": "금리 인하 수혜 전략",
};

const PERIODS: { value: BacktestPeriod; label: string }[] = [
  { value: "1y", label: "1년" },
  { value: "3y", label: "3년" },
  { value: "5y", label: "5년" },
  { value: "10y", label: "10년" },
];

const BATTLE_PRESETS: Array<{ left: StrategyId; right: StrategyId; label: string }> = [
  { left: "growth", right: "value", label: "성장 vs 가치" },
  { left: "momentum", right: "dividend", label: "모멘텀 vs 배당" },
  { left: "quality-factor", right: "value", label: "퀄리티 vs 가치" },
];

export default function StrategyBattlePanel() {
  const [leftId, setLeftId] = useState<StrategyId>("growth");
  const [rightId, setRightId] = useState<StrategyId>("value");
  const [period, setPeriod] = useState<BacktestPeriod>("3y");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBattle = async () => {
    if (leftId === rightId) {
      setError("서로 다른 전략 2개를 선택해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quant/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategies: [leftId, rightId], period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "비교 실패");
      setResult(data as CompareResult);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "비교 실패");
    } finally {
      setLoading(false);
    }
  };

  const chartData =
    result?.strategies.map((s) => ({
      name: s.name.replace(" 전략", ""),
      return: s.stats.totalReturn,
    })) ?? [];

  return (
    <div className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4 card-glow">
      <div>
        <h3 className="text-sm font-bold text-white">전략 배틀</h3>
        <p className="text-[10px] text-neutral">
          두 전략의 백테스트 성과를 직접 비교합니다
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {BATTLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setLeftId(preset.left);
              setRightId(preset.right);
            }}
            className="rounded-md border border-surface-border px-2 py-1 text-[10px] text-neutral hover:border-accent/30 hover:text-accent"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StrategySelect label="전략 A" value={leftId} onChange={setLeftId} exclude={rightId} />
        <StrategySelect label="전략 B" value={rightId} onChange={setRightId} exclude={leftId} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-neutral">기간</span>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={`rounded-md px-2 py-0.5 text-[10px] ${
              period === p.value
                ? "bg-accent/20 text-accent"
                : "text-neutral hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={runBattle}
          disabled={loading}
          className="ml-auto rounded-lg bg-accent/20 px-4 py-1.5 text-xs font-semibold text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {loading ? "비교 중…" : "배틀 시작"}
        </button>
      </div>

      {error && <p className="text-sm text-bearish">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="h-48">
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
                  formatter={(value) => [
                    `${Number(value ?? 0).toFixed(1)}%`,
                    "누적 수익률",
                  ]}
                />
                <Bar dataKey="return" fill="#f0b429" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {result.strategies.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-surface-border p-3"
              >
                <h4 className="mb-2 text-sm font-semibold text-white">{s.name}</h4>
                <BacktestStatsGrid stats={s.stats} />
              </div>
            ))}
          </div>

          <BattleAiSummary result={result} />
          <ResearchDisclaimer variant="backtest" />
        </div>
      )}
    </div>
  );
}

function StrategySelect({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: StrategyId;
  onChange: (id: StrategyId) => void;
  exclude: StrategyId;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] text-neutral">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StrategyId)}
        className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white"
      >
        {BASIC_STYLE_STRATEGY_IDS.filter((id) => id !== exclude).map((id) => (
          <option key={id} value={id}>
            {STRATEGY_LABELS[id]}
          </option>
        ))}
      </select>
    </label>
  );
}

function BattleAiSummary({ result }: { result: CompareResult }) {
  const [a, b] = result.strategies;
  if (!a || !b) return null;

  const winner = a.stats.cagr >= b.stats.cagr ? a : b;
  const loser = winner === a ? b : a;
  const cagrDiff = Math.abs(a.stats.cagr - b.stats.cagr).toFixed(1);
  const sharpeWinner = a.stats.sharpe >= b.stats.sharpe ? a : b;

  const text = `${winner.name}이(가) CAGR ${winner.stats.cagr.toFixed(1)}%로 ${loser.name}(${loser.stats.cagr.toFixed(1)}%) 대비 ${cagrDiff}%p 우위입니다. Sharpe Ratio는 ${sharpeWinner.name.replace(" 전략", "")}(${sharpeWinner.stats.sharpe.toFixed(2)})가 더 높습니다.`;

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
      <p className="text-[10px] font-semibold text-accent mb-0.5">AI 해석</p>
      <p className="text-xs leading-relaxed text-gray-300">{text}</p>
    </div>
  );
}
