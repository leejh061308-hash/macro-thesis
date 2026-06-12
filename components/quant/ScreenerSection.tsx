"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ScreenerResultCard from "@/components/screener/ScreenerResultCard";
import { useScreenerPresets } from "@/hooks/useScreenerPresets";
import type {
  StrategyCategory,
  StrategyDefinition,
  StrategyId,
} from "@/lib/quant/types";
import type {
  AdvancedFilters,
  BeginnerMacro,
  BeginnerTheme,
  MacroFilter,
  RangeFilter,
  ScreenerRequest,
  ScreenerResult,
  ScreenerRunResponse,
  SortField,
} from "@/lib/screener/types";

interface ScreenerSectionProps {
  strategies: StrategyDefinition[];
  selectedStrategyId: StrategyId | null;
  onSelectStrategy: (id: StrategyId) => void;
  favoriteTickers: string[];
  onToggleTickerFavorite: (ticker: string) => void;
  compareSelection: StrategyId[];
  onToggleCompare: (id: StrategyId) => void;
  onCompare: () => void;
  compareLoading: boolean;
}

type ViewMode = "basic" | "advanced" | "ai";

const CATEGORY_LABELS: Record<StrategyCategory, string> = {
  core: "기본 전략",
  factor: "팩터 전략",
  macro: "거시경제 전략",
};

const THEME_CHIPS: { id: BeginnerTheme; label: string }[] = [
  { id: "ai", label: "AI 수혜주" },
  { id: "datacenter", label: "데이터센터" },
  { id: "power-infra", label: "전력 인프라" },
  { id: "cloud", label: "클라우드" },
  { id: "semiconductor", label: "반도체" },
];

const MACRO_CHIPS: { id: BeginnerMacro; label: string }[] = [
  { id: "rate-hike", label: "금리 인상 수혜" },
  { id: "rate-cut", label: "금리 인하 수혜" },
  { id: "expansion", label: "경기 확장" },
  { id: "recession-defense", label: "경기 침체 방어" },
];

const EXTRA_MACRO: { id: MacroFilter; label: string }[] = [
  { id: "cyclical", label: "경기민감주" },
  { id: "defensive", label: "경기방어주" },
  { id: "jpy-strong", label: "엔화 강세 수혜" },
  { id: "jpy-weak", label: "엔화 약세 수혜" },
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

const MODE_TABS: { id: ViewMode; label: string }[] = [
  { id: "basic", label: "기본" },
  { id: "advanced", label: "고급" },
  { id: "ai", label: "AI" },
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

function SortControls({
  sort,
  sortDir,
  onSortChange,
  onSortDirToggle,
}: {
  sort: SortField;
  sortDir: "asc" | "desc";
  onSortChange: (sort: SortField) => void;
  onSortDirToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortField)}
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
        onClick={onSortDirToggle}
        className="rounded-lg border border-surface-border px-3 py-2 text-[11px] text-neutral"
      >
        {sortDir === "desc" ? "내림차순" : "오름차순"}
      </button>
    </div>
  );
}

function presetToViewMode(preset: ScreenerRequest): ViewMode {
  if (preset.mode === "ai" || preset.aiQuery) return "ai";
  if (preset.mode === "advanced" || preset.advanced) return "advanced";
  return "basic";
}

export default function ScreenerSection({
  strategies,
  selectedStrategyId,
  onSelectStrategy,
  favoriteTickers,
  onToggleTickerFavorite,
  compareSelection,
  onToggleCompare,
  onCompare,
  compareLoading,
}: ScreenerSectionProps) {
  const [mode, setMode] = useState<ViewMode>("basic");
  const [themes, setThemes] = useState<BeginnerTheme[]>([]);
  const [macroBeginner, setMacroBeginner] = useState<BeginnerMacro[]>([]);
  const [extraMacro, setExtraMacro] = useState<MacroFilter[]>([]);
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

  const basicMacroFilters = useMemo(
    () => [...new Set(themes as MacroFilter[])],
    [themes]
  );

  const advancedMacroFilters = useMemo(
    () => [...new Set([...(themes as MacroFilter[]), ...extraMacro])],
    [themes, extraMacro]
  );

  const buildBasicRequest = useCallback((): ScreenerRequest => {
    return {
      mode: "beginner",
      beginner: { themes, macro: macroBeginner },
      strategies: selectedStrategyId ? [selectedStrategyId] : undefined,
      macroFilters: basicMacroFilters.length > 0 ? basicMacroFilters : undefined,
      sort,
      sortDir,
      limit: 40,
    };
  }, [themes, macroBeginner, selectedStrategyId, basicMacroFilters, sort, sortDir]);

  const buildAdvancedRequest = useCallback((): ScreenerRequest => {
    return {
      mode: "advanced",
      beginner: { themes, macro: macroBeginner },
      strategies: selectedStrategyId ? [selectedStrategyId] : undefined,
      macroFilters: advancedMacroFilters.length > 0 ? advancedMacroFilters : undefined,
      advanced,
      sort,
      sortDir,
      limit: 50,
    };
  }, [
    themes,
    macroBeginner,
    selectedStrategyId,
    advancedMacroFilters,
    advanced,
    sort,
    sortDir,
  ]);

  const runSearch = useCallback(async (request: ScreenerRequest) => {
    setLoading(true);
    setSearched(true);
    setError(null);
    setAiInterpreted(null);

    try {
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
  }, []);

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) {
      setError("자연어 검색 문장을 입력해주세요.");
      return;
    }
    setLoading(true);
    setSearched(true);
    setError(null);
    setAiInterpreted(null);
    try {
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
    } catch (e) {
      setResults([]);
      setSummary([]);
      setError(e instanceof Error ? e.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "basic" || !selectedStrategyId) return;
    runSearch({
      mode: "beginner",
      beginner: { themes, macro: macroBeginner },
      strategies: [selectedStrategyId],
      macroFilters: basicMacroFilters.length > 0 ? basicMacroFilters : undefined,
      sort,
      sortDir,
      limit: 40,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 기본 탭에서 전략 선택 시에만 자동 검색
  }, [selectedStrategyId, mode]);

  const applyPreset = (presetRequest: ScreenerRequest) => {
    setMode(presetToViewMode(presetRequest));
    setSort(presetRequest.sort ?? "companyScore");
    setSortDir(presetRequest.sortDir ?? "desc");
    setThemes(presetRequest.beginner?.themes ?? []);
    setMacroBeginner(presetRequest.beginner?.macro ?? []);
    setExtraMacro(presetRequest.macroFilters ?? []);
    setAdvanced(presetRequest.advanced ?? {});
    if (presetRequest.strategies?.[0]) onSelectStrategy(presetRequest.strategies[0]);
    if (presetRequest.aiQuery) setAiQuery(presetRequest.aiQuery);
  };

  const saveCurrentPreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const request =
      mode === "advanced"
        ? buildAdvancedRequest()
        : mode === "ai"
          ? { mode: "ai" as const, aiQuery, sort, sortDir, limit: 30 }
          : buildBasicRequest();
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
    setAdvanced((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const categories: StrategyCategory[] = ["core", "factor", "macro"];

  const searchLabel =
    mode === "ai"
      ? "AI 스크리닝 실행"
      : mode === "advanced"
        ? "고급 조건으로 검색"
        : "선택 조건으로 검색";

  const handleSearch = () => {
    if (mode === "ai") {
      handleAiSearch();
      return;
    }
    if (mode === "advanced") {
      runSearch(buildAdvancedRequest());
      return;
    }
    runSearch(buildBasicRequest());
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-xl border border-surface-border bg-surface-card p-1">
        {MODE_TABS.map((tab) => (
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

      {mode === "basic" && (
        <>
          <p className="text-xs text-gray-400">
            검증된 투자 전략을 선택하고 테마·거시 조건을 추가해 검색하세요.
          </p>

          {categories.map((cat) => {
            const group = strategies.filter((s) => s.category === cat);
            if (group.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <div className="grid gap-2">
                  {group.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelectStrategy(s.id)}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        selectedStrategyId === s.id
                          ? "border-accent/40 bg-accent/10"
                          : "border-surface-border bg-surface-card hover:border-accent/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-accent">{s.icon}</span>
                          <span className="text-sm font-semibold text-white">
                            {s.shortName}
                          </span>
                        </div>
                        <label className="flex items-center gap-1 text-[10px] text-neutral">
                          <input
                            type="checkbox"
                            checked={compareSelection.includes(s.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              onToggleCompare(s.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="accent-accent"
                          />
                          비교
                        </label>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">{s.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {compareSelection.length >= 2 && (
            <button
              type="button"
              onClick={onCompare}
              disabled={compareLoading}
              className="w-full rounded-lg border border-accent/30 bg-accent/10 py-2.5 text-sm font-semibold text-accent disabled:opacity-50"
            >
              {compareLoading
                ? "비교 중..."
                : `${compareSelection.length}개 전략 비교하기`}
            </button>
          )}

          <div className="rounded-xl border border-surface-border bg-surface-card p-3">
            <h4 className="text-xs font-semibold text-gray-300">테마 · 거시 (선택)</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {THEME_CHIPS.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  active={themes.includes(t.id)}
                  onClick={() => setThemes((prev) => toggleItem(prev, t.id))}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {MACRO_CHIPS.map((m) => (
                <Chip
                  key={m.id}
                  label={m.label}
                  active={macroBeginner.includes(m.id)}
                  onClick={() => setMacroBeginner((prev) => toggleItem(prev, m.id))}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {mode === "advanced" && (
        <>
          <p className="text-xs text-gray-400">
            PER, ROE, 모멘텀 등 지표를 직접 입력해 원하는 조건으로 검색하세요.
          </p>

          <div className="flex flex-wrap gap-2">
            {EXTRA_MACRO.map((m) => (
              <Chip
                key={m.id}
                label={m.label}
                active={extraMacro.includes(m.id)}
                onClick={() => setExtraMacro((prev) => toggleItem(prev, m.id))}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <RangeField label="PER" value={advanced.peRatio} onChange={(v) => setRange("peRatio", v)} step={1} />
            <RangeField label="PBR" value={advanced.pbRatio} onChange={(v) => setRange("pbRatio", v)} step={0.1} />
            <RangeField label="ROE" value={advanced.roe} onChange={(v) => setRange("roe", v)} />
            <RangeField label="매출 성장률" value={advanced.revenueGrowth} onChange={(v) => setRange("revenueGrowth", v)} />
            <RangeField label="EPS 성장률" value={advanced.epsGrowth} onChange={(v) => setRange("epsGrowth", v)} />
            <RangeField label="배당수익률" value={advanced.dividendYield} onChange={(v) => setRange("dividendYield", v)} />
            <RangeField label="부채비율(D/E)" value={advanced.debtToEquity} onChange={(v) => setRange("debtToEquity", v)} step={0.1} />
            <RangeField label="시가총액($)" value={advanced.marketCap} onChange={(v) => setRange("marketCap", v)} step={1_000_000_000} />
            <RangeField label="12개월 수익률" value={advanced.return12m} onChange={(v) => setRange("return12m", v)} />
            <RangeField label="RSI" value={advanced.rsi} onChange={(v) => setRange("rsi", v)} step={1} />
          </div>

          <div className="flex flex-wrap gap-2">
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
        </>
      )}

      {mode === "ai" && (
        <>
          <p className="text-xs text-gray-400">
            원하는 조건을 자연어로 입력하면 AI가 해석해 스크리닝합니다.
          </p>
          <textarea
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            rows={4}
            placeholder='예: "저평가된 AI 관련 기업 찾아줘" · "배당도 높고 부채도 낮은 기업"'
            className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm text-white placeholder:text-neutral"
          />
          <p className="text-[10px] text-gray-500">
            GPT 사용 · 버튼 클릭 시에만 호출됩니다.
          </p>
        </>
      )}

      {mode !== "ai" && (
        <SortControls
          sort={sort}
          sortDir={sortDir}
          onSortChange={setSort}
          onSortDirToggle={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
        />
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="조건 저장 이름"
          className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-[11px] text-white"
        />
        <button
          type="button"
          onClick={saveCurrentPreset}
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
        disabled={loading || (mode === "ai" && !aiQuery.trim())}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-surface disabled:opacity-50"
      >
        {loading ? "검색 중..." : searchLabel}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {searched && !loading && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">검색 결과</h3>
          <p className="text-xs text-neutral">{results.length}개 종목</p>
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
