import { ALL_FACTOR_IDS, computeAllFactorScores } from "./factors";
import { buildAiFactorSummary, computeMultiFactorScore } from "./multi-factor";
import type {
  FactorId,
  FactorRanks,
  FactorScores,
  FactorWeights,
  QuantMetrics,
  RankingEntry,
} from "./types";

function computeRanks(
  scores: Map<string, number>
): Map<string, number> {
  const sorted = [...scores.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  const ranks = new Map<string, number>();
  sorted.forEach(([ticker, _], i) => ranks.set(ticker, i + 1));
  return ranks;
}

function buildFactorRanks(
  universe: QuantMetrics[],
  factorScores: Map<string, FactorScores>
): Map<string, FactorRanks> {
  const result = new Map<string, FactorRanks>();

  for (const factorId of ALL_FACTOR_IDS) {
    const scores = new Map<string, number>();
    for (const m of universe) {
      const fs = factorScores.get(m.ticker);
      if (fs) scores.set(m.ticker, fs[factorId]);
    }
    const ranks = computeRanks(scores);
    for (const [ticker, rank] of ranks) {
      const existing = result.get(ticker) ?? {
        value: 0,
        quality: 0,
        growth: 0,
        momentum: 0,
        stability: 0,
      };
      existing[factorId] = rank;
      result.set(ticker, existing);
    }
  }

  return result;
}

export function buildUniverseRanking(
  universe: QuantMetrics[],
  weights?: FactorWeights,
  limit = 100
): RankingEntry[] {
  const factorScores = new Map<string, FactorScores>();
  for (const m of universe) {
    factorScores.set(m.ticker, computeAllFactorScores(m, universe));
  }

  const factorRanks = buildFactorRanks(universe, factorScores);

  const defaultWeights: FactorWeights = weights ?? {
    value: 20,
    quality: 20,
    growth: 20,
    momentum: 20,
    stability: 20,
  };

  const overallScores = new Map<string, number>();
  for (const m of universe) {
    overallScores.set(
      m.ticker,
      computeMultiFactorScore(m, universe, defaultWeights)
    );
  }
  const overallRanks = computeRanks(overallScores);

  const entries: RankingEntry[] = universe
    .map((m) => {
      const factors = factorScores.get(m.ticker)!;
      const overallScore = overallScores.get(m.ticker) ?? 0;
      return {
        ticker: m.ticker,
        name: m.name,
        factors,
        factorRanks: factorRanks.get(m.ticker) ?? {
          value: 0,
          quality: 0,
          growth: 0,
          momentum: 0,
          stability: 0,
        },
        overallScore,
        overallRank: overallRanks.get(m.ticker) ?? 0,
        aiSummary: buildAiFactorSummary(factors, overallScore),
      };
    })
    .filter((e) => e.overallScore > 0)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, limit)
    .map((e, i) => ({ ...e, overallRank: i + 1 }));

  return entries;
}

export function rankByFactor(
  universe: QuantMetrics[],
  factorId: FactorId,
  limit = 100
): RankingEntry[] {
  const weights: FactorWeights = {
    value: factorId === "value" ? 100 : 0,
    quality: factorId === "quality" ? 100 : 0,
    growth: factorId === "growth" ? 100 : 0,
    momentum: factorId === "momentum" ? 100 : 0,
    stability: factorId === "stability" ? 100 : 0,
  };
  return buildUniverseRanking(universe, weights, limit);
}

export function rankByMultiFactor(
  universe: QuantMetrics[],
  weights: FactorWeights,
  limit = 100
): RankingEntry[] {
  return buildUniverseRanking(universe, weights, limit);
}

export function getStockFactorDetail(
  ticker: string,
  universe: QuantMetrics[],
  weights?: FactorWeights
): RankingEntry | null {
  const m = universe.find((x) => x.ticker === ticker);
  if (!m) return null;

  const all = buildUniverseRanking(universe, weights, universe.length);
  const entry = all.find((e) => e.ticker === ticker);
  if (entry) return entry;

  const factors = computeAllFactorScores(m, universe);
  const w = weights ?? { value: 20, quality: 20, growth: 20, momentum: 20, stability: 20 };
  const overallScore = computeMultiFactorScore(m, universe, w);

  return {
    ticker: m.ticker,
    name: m.name,
    factors,
    factorRanks: { value: 0, quality: 0, growth: 0, momentum: 0, stability: 0 },
    overallScore,
    overallRank: 0,
    aiSummary: buildAiFactorSummary(factors, overallScore),
  };
}
