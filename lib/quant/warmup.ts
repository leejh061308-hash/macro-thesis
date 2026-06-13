import { getCached } from "./cache";
import { getScoringUniverseMetrics, getStrategyOverviews } from "./service";
import { getStrategyEntryEnvironments } from "@/lib/timing/service";

export type QuantCacheStatus = "ready" | "warming" | "cold";

const OVERVIEW_CACHE_KEY = "strategy-overview-v9";

let warmInFlight: Promise<void> | null = null;

export function getQuantCacheStatus(): QuantCacheStatus {
  const cached = getCached<unknown[]>(OVERVIEW_CACHE_KEY);
  if (cached?.length) return "ready";
  if (warmInFlight) return "warming";
  return "cold";
}

/** 전략 개요·유니버스 캐시를 미리 채웁니다. 중복 호출 시 동일 Promise를 공유합니다. */
export function ensureQuantCacheWarm(): Promise<void> {
  if (getQuantCacheStatus() === "ready") {
    return Promise.resolve();
  }

  if (!warmInFlight) {
    warmInFlight = getScoringUniverseMetrics()
      .then(() => getStrategyOverviews({ includeEntry: false }))
      .then(() => getStrategyEntryEnvironments())
      .then(() => undefined)
      .finally(() => {
        warmInFlight = null;
      });
  }

  return warmInFlight;
}

/** 백그라운드 워밍 — 응답을 기다리지 않을 때 */
export function triggerQuantWarmup(): void {
  void ensureQuantCacheWarm();
}
