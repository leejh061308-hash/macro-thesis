"use client";

import { useMemo, useState } from "react";
import ScreenerResultCard from "@/components/screener/ScreenerResultCard";
import { useScreenerPresets } from "@/hooks/useScreenerPresets";
import type { StrategyId } from "@/lib/quant/types";
import type {
  AdvancedFilters,
  BeginnerMacro,
  BeginnerStyle,
  BeginnerTheme,
  MacroFilter,
  RangeFilter,
  ScreenerMode,
  ScreenerRequest,
  ScreenerResult,
  ScreenerRunResponse,
  SortField,
} from "@/lib/screener/types";

interface ScreenerSectionProps {
  favoriteTickers: string[];
  onToggleTickerFavorite: (ticker: string) => void;
}

type ModeTab = ScreenerMode;

const BEGINNER_STYLES: { id: BeginnerStyle; label: string }[] = [
  { id: "undervalued", label: "저평가 기업" },
  { id: "high-growth", label: "고성장 기업" },
  { id: "dividend", label: "배당주" },
  { id: "quality", label: "우량주" },
  { id: "low-volatility", label: "저변동성 기업" },
  { id: "defensive", label: "경기방어주" },
  { id: "cyclical", label: "경기민감주" },
];

const BEGINNER_THEMES: { id: BeginnerTheme; label: string }[] = [
  { id: "ai", label: "AI 수혜주" },
  { id: "datacenter", label: "데이터센터 수혜주" },
  { id: "power-infra", label: "전력 인프라 수혜주" },
  { id: "cloud", label: "클라우드 수혜주" },
  { id: "semiconductor", label: "반도체 수혜주" },
];

const BEGINNER_MACRO: { id: BeginnerMacro; label: string }[] = [
  { id: "rate-hike", label: "금리 인상 수혜주" },
  { id: "rate-cut", label: "금리 인하 수혜주" },
  { id: "expansion", label: "경기 확장 수혜주" },
  { id: "recession-defense", label: "경기 침체 방어주" },
];

const STRATEGY_FILTERS: { id: StrategyId; label: string }[] = [
  { id: "value", label: "가치주 전략" },
  { id: "growth", label: "성장주 전략" },
  { id: "dividend", label: "배당주 전략" },
  { id: "quality-factor", label: "퀄리티 전략" },
  { id: "momentum", label: "모멘텀 전략" },
  { id: "garp", label: "GARP 전략" },
  { id: "buffett", label: "버핏 전략" },
  { id: "moat", label: "경제적 해자 전략" },
  { id: "defensive", label: "경기방어주 전략" },
];

const MACRO_FILTERS: { id: MacroFilter; label: string }[] = [
  { id: "ai", label: "AI 수혜주" },
  { id: "datacenter", label: "데이터센터 수혜주" },
  { id: "power-infra", label: "전력 인프라 수혜주" },
  { id: "cloud", label: "클라우드 수혜주" },
  { id: "semiconductor", label: "반도체 수혜주" },
  { id: "rate-hike", label: "금리 인상 수혜주" },
  { id: "rate-cut", label: "금리 인하 수혜주" },
  { id: "cyclical", label: "경기민감주" },
  { id: "defensive", label: "경기방어주" },
  { id: "jpy-strong", label: "엔화 강세 수혜주" },
  { id: "jpy-weak", label: "엔화 약세 수혜주" },
];

const SORT_OPTIONS: { id: SortField; label: string }[] = [
  { id: "companyScore", label: "기업 점수" },
  { id: "timingScore", label: "진입 점수" },
  { id: "peRatio", label: "PER" },
  { id: "roe", label: "ROE" },
  { id: "dividendYield", label: "배당수익률" },
  { id: "revenueGrowth", label: "매출 성장률" },
  { id: "epsGrowth", label: "EPS 성장률" },
  { id: "marketCap", label: "시가총액" },
  { id: "return12m", label: "최근 수익률" },
];

function toggleItem<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? "bg-accent/20 text-accent border border-accent/30"
          : "text-neutral border border-surface-border"
      }`}
    >
      {label}
    </button>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-3">
      <h4 className="text-xs font-semibold text-gray-300">{title}</h4>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function RangeField({
  label,
  value,
  onChange,
  step = 0.01,
}: {
  label: string;
  value?: RangeFilter;
  onChange: (next?: RangeFilter) => void;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-surface-border/70 bg-surface/40 px-2 py-1.5">
      <span className="text-[10px] text-gray-400">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          placeholder="최소"
          value={value?.min ?? ""}
          onChange={(e) => {
            const min = e.target.value === "" ? undefined : Number(e.target.value);
            const next = { ...value, min };
            onChange(next.min == null && next.max == null ? undefined : next);
          }}
          className="w-full rounded border border-surface-border bg-surface px-2 py-1 text-[11px] text-white"
        />
        <span className="text-[10px] text-neutral">~</span>
        <input
          type="number"
          step={step}
          placeholder="최대"
          value={value?.max ?? ""}
          onChange={(e) => {
            const max = e.target.value === "" ? undefined : Number(e.target.value);
            const next = { ...value, max };
            onChange(next.min == null && next.max == null ? undefined : next);
          }}
          className="w-full rounded border border-surface-border bg-surface px-2 py-1 text-[11px] text-white"
        />
      </div>
    </div>
  );
}

export default function ScreenerSection({
  favoriteTickers,
  onToggleTickerFavorite,
}: ScreenerSectionProps) {
  const [mode, setMode] = useState<ModeTab>("beginner");
  const [styles, setStyles] = useState<BeginnerStyle[]>([]);
  const [themes, setThemes] = useState<BeginnerTheme[]>([]);
  const [macroBeginner, setMacroBeginner] = useState<BeginnerMacro[]>([]);
  const [strategies, setStrategies] = useState<StrategyId[]>([]);
  const [macroFilters, setMacroFilters] = useState<MacroFilter[]>([]);
  const [advanced, setAdvanced] = useState<AdvancedFilters>({});
  const [sort, setSort] = useState<SortField>("companyScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [aiQuery, setAiQuery] = useState("");
  const [presetName, setPresetName] = useState("");
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [summary, setSummary] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiInterpreted, setAiInterpreted] = useState<string | null>(null);

  const { presets, savePreset, removePreset } = useScreenerPresets();

  const request = useMemo((): ScreenerRequest => {
    if (mode === "beginner") {
      return {
        mode: "beginner",
        beginner: { styles, themes, macro: macroBeginner },
        sort,
        sortDir,
        limit: 40,
      };
    }
    if (mode === "ai") {
      return {
        mode: "ai",
        aiQuery,
        sort,
        sortDir,
        limit: 30,
      };
    }
    return {
      mode: "advanced",
      advanced,
      strategies,
      macroFilters,
      sort,
      sortDir,
      limit: 50,
    };
  }, [mode, styles, themes, macroBeginner, advanced, strategies, macroFilters, sort, sortDir, aiQuery]);

  const applyPreset = (presetRequest: ScreenerRequest) => {
    setMode(presetRequest.mode);
    setSort(presetRequest.sort ?? "companyScore");
    setSortDir(presetRequest.sortDir ?? "desc");
    setStyles(presetRequest.beginner?.styles ?? []);
    setThemes(presetRequest.beginner?.themes ?? []);
    setMacroBeginner(presetRequest.beginner?.macro ?? []);
    setStrategies(presetRequest.strategies ?? []);
    setMacroFilters(presetRequest.macroFilters ?? []);
    setAdvanced(presetRequest.advanced ?? {});
    if (presetRequest.aiQuery) setAiQuery(presetRequest.aiQuery);
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    setError(null);
    setAiInterpreted(null);

    try {
      if (mode === "ai") {
        if (!aiQuery.trim()) {
          setError("자연어 검색 문장을 입력해주세요.");
          setResults([]);
          return;
        }
        const res = await fetch("/api/screener/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: aiQuery.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "AI 스크리너 실패");
        setResults(data.results ?? []);
        setSummary(data.appliedSummary ?? []);
        setAiInterpreted(JSON.stringify(data.interpretedRequest, null, 2));
        return;
      }

      const res = await fetch("/api/quant/screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = (await res.json()) as ScreenerRunResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "스크리너 실패");
      setResults(data.results ?? []);
      setSummary(data.appliedSummary ?? []);
    } catch (e) {
      setResults([]);
      setSummary([]);
      setError(e instanceof Error ? e.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    savePreset(name, request);
    setPresetName("");
  };

  const setRange = (key: keyof AdvancedFilters, value?: RangeFilter) => {
    setAdvanced((prev) => {
      const next = { ...prev };
      if (value) next[key] = value as never;
      else delete next[key];
      return next;
    });
  };

  const toggleBool = (key: keyof AdvancedFilters) => {
    setAdvanced((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        조건에 맞는 종목을 찾고, 왜 선택되었는지 이해할 수 있는 AI 퀀트 스크리너입니다.
      </p>

      <div className="flex gap-2 rounded-xl border border-surface-border bg-surface-card p-1">
        {(
          [
            { id: "beginner" as const, label: "초급" },
            { id: "advanced" as const, label: "고급" },
            { id: "ai" as const, label: "AI" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              mode === tab.id
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-neutral hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "beginner" && (
        <div className="space-y-3">
          <FilterGroup title="투자 스타일">
            {BEGINNER_STYLES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                active={styles.includes(s.id)}
                onClick={() => setStyles((prev) => toggleItem(prev, s.id))}
              />
            ))}
          </FilterGroup>
          <FilterGroup title="테마">
            {BEGINNER_THEMES.map((t) => (
              <Chip
                key={t.id}
                label={t.label}
                active={themes.includes(t.id)}
                onClick={() => setThemes((prev) => toggleItem(prev, t.id))}
              />
            ))}
          </FilterGroup>
          <FilterGroup title="거시경제">
            {BEGINNER_MACRO.map((m) => (
              <Chip
                key={m.id}
                label={m.label}
                active={macroBeginner.includes(m.id)}
                onClick={() => setMacroBeginner((prev) => toggleItem(prev, m.id))}
              />
            ))}
          </FilterGroup>
        </div>
      )}

      {mode === "advanced" && (
        <div className="space-y-3">
          <FilterGroup title="전략 필터">
            {STRATEGY_FILTERS.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                active={strategies.includes(s.id)}
                onClick={() => setStrategies((prev) => toggleItem(prev, s.id))}
              />
            ))}
          </FilterGroup>
          <FilterGroup title="거시경제 필터">
            {MACRO_FILTERS.map((m) => (
              <Chip
                key={m.id}
                label={m.label}
                active={macroFilters.includes(m.id)}
                onClick={() => setMacroFilters((prev) => toggleItem(prev, m.id))}
              />
            ))}
          </FilterGroup>

          <div className="rounded-xl border border-surface-border bg-surface-card p-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-300">가치 · 성장 · 수익성</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <RangeField label="PER" value={advanced.peRatio} onChange={(v) => setRange("peRatio", v)} step={1} />
              <RangeField label="PBR" value={advanced.pbRatio} onChange={(v) => setRange("pbRatio", v)} step={0.1} />
              <RangeField label="ROE" value={advanced.roe} onChange={(v) => setRange("roe", v)} />
              <RangeField label="매출 성장률" value={advanced.revenueGrowth} onChange={(v) => setRange("revenueGrowth", v)} />
              <RangeField label="EPS 성장률" value={advanced.epsGrowth} onChange={(v) => setRange("epsGrowth", v)} />
              <RangeField label="배당수익률" value={advanced.dividendYield} onChange={(v) => setRange("dividendYield", v)} />
              <RangeField label="부채비율(D/E)" value={advanced.debtToEquity} onChange={(v) => setRange("debtToEquity", v)} step={0.1} />
              <RangeField label="시가총액($)" value={advanced.marketCap} onChange={(v) => setRange("marketCap", v)} step={1_000_000_000} />
            </div>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-card p-3">
            <h4 className="text-xs font-semibold text-gray-300">모멘텀 · 기술적</h4>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <RangeField label="12개월 수익률" value={advanced.return12m} onChange={(v) => setRange("return12m", v)} />
              <RangeField label="RSI" value={advanced.rsi} onChange={(v) => setRange("rsi", v)} step={1} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "aboveMa20" as const, label: "20일선 상회" },
                { key: "aboveMa60" as const, label: "60일선 상회" },
                { key: "aboveMa200" as const, label: "200일선 상회" },
                { key: "goldenCross" as const, label: "Golden Cross" },
                { key: "near52WeekHigh" as const, label: "52주 신고가 근접" },
                { key: "near52WeekLow" as const, label: "52주 신저가 근접" },
              ].map((item) => (
                <Chip
                  key={item.key}
                  label={item.label}
                  active={!!advanced[item.key]}
                  onClick={() => toggleBool(item.key)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "ai" && (
        <div className="space-y-2">
          <textarea
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            rows={4}
            placeholder='예: "저평가된 AI 관련 기업 찾아줘" · "배당도 높고 부채도 낮은 기업"'
            className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm text-white placeholder:text-neutral"
          />
          <p className="text-[10px] text-gray-500">
            AI가 조건을 해석한 뒤 스크리닝합니다. (GPT 사용 · 버튼 클릭 시에만 호출)
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortField)}
          className="rounded-lg border border-surface-border bg-surface-card px-2 py-2 text-[11px] text-white"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="rounded-lg border border-surface-border px-3 py-2 text-[11px] text-neutral"
        >
          {sortDir === "desc" ? "내림차순" : "오름차순"}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="조건 이름 (예: 내 가치주 전략)"
          className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-[11px] text-white"
        />
        <button
          type="button"
          onClick={handleSavePreset}
          disabled={!presetName.trim()}
          className="shrink-0 rounded-lg border border-surface-border px-3 py-2 text-[11px] text-neutral disabled:opacity-40"
        >
          저장
        </button>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyPreset(p.request)}
                className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] text-accent"
              >
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => removePreset(p.id)}
                className="text-[10px] text-neutral"
                aria-label="삭제"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleSearch}
        disabled={loading}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-surface disabled:opacity-50"
      >
        {loading ? "검색 중..." : mode === "ai" ? "AI 스크리닝 실행" : "조건 충족 종목 검색"}
      </button>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {searched && !loading && (
        <div className="space-y-1">
          <p className="text-xs text-neutral">{results.length}개 종목 발견</p>
          {summary.length > 0 && (
            <p className="text-[10px] text-gray-500">{summary.join(" · ")}</p>
          )}
        </div>
      )}

      {aiInterpreted && mode === "ai" && (
        <details className="rounded-lg border border-surface-border bg-surface/40 px-3 py-2">
          <summary className="cursor-pointer text-[10px] text-gray-400">AI 해석 조건 보기</summary>
          <pre className="mt-2 overflow-x-auto text-[9px] text-gray-500">{aiInterpreted}</pre>
        </details>
      )}

      <div className="space-y-3">
        {results.map((item) => (
          <ScreenerResultCard
            key={item.ticker}
            item={item}
            isFavorite={favoriteTickers.includes(item.ticker)}
            onToggleFavorite={() => onToggleTickerFavorite(item.ticker)}
          />
        ))}
      </div>
    </div>
  );
}
