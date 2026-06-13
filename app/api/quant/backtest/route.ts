import { NextRequest, NextResponse } from "next/server";
import { runFactorBacktest, compareWithBenchmarks } from "@/lib/quant/service";
import { BACKTEST_PERIODS } from "@/lib/quant/constants";
import {
  isValidMultiFactorId,
  PORTFOLIO_SIZES,
  REBALANCE_FREQUENCIES,
} from "@/lib/quant/index-universe";
import { getMultiFactorStrategy } from "@/lib/quant/multi-factor";
import type {
  BacktestConfig,
  BacktestPeriod,
  FactorWeights,
  MultiFactorStrategyId,
  PortfolioSize,
  RebalanceFrequency,
} from "@/lib/quant/types";

function parseConfig(body: Record<string, unknown>): BacktestConfig | null {
  const period = (body.period ?? "3y") as BacktestPeriod;
  if (!BACKTEST_PERIODS.includes(period)) return null;

  const rebalance = (body.rebalance ?? "quarterly") as RebalanceFrequency;
  if (!REBALANCE_FREQUENCIES.includes(rebalance)) return null;

  const portfolioSize = Number(body.portfolioSize ?? 20) as PortfolioSize;
  if (!PORTFOLIO_SIZES.includes(portfolioSize)) return null;

  const strategyId = (body.strategyId ?? "all-factor") as
    | MultiFactorStrategyId
    | "custom";

  let weights: FactorWeights;
  if (strategyId === "custom" && body.weights) {
    weights = body.weights as FactorWeights;
  } else if (strategyId !== "custom" && isValidMultiFactorId(strategyId)) {
    weights = getMultiFactorStrategy(strategyId).defaultWeights;
  } else {
    weights = getMultiFactorStrategy("all-factor").defaultWeights;
  }

  return { period, rebalance, portfolioSize, weights, strategyId };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const config = parseConfig(body);
    if (!config) {
      return NextResponse.json({ error: "Invalid backtest config" }, { status: 400 });
    }

    const compareBenchmarks = body.compareBenchmarks === true;
    const result = compareBenchmarks
      ? await compareWithBenchmarks(config)
      : await runFactorBacktest(config);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[quant/backtest]", error);
    return NextResponse.json(
      { error: "백테스트 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
