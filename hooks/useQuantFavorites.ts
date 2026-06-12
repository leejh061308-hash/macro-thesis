"use client";

import { useCallback, useEffect, useState } from "react";
import type { StrategyId } from "@/lib/quant/types";

const STORAGE_KEY = "macrolens-quant-favorites";

interface Favorites {
  strategies: StrategyId[];
  tickers: string[];
}

const DEFAULT: Favorites = { strategies: [], tickers: [] };

export function useQuantFavorites() {
  const [favorites, setFavorites] = useState<Favorites>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw) as Favorites);
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((next: Favorites) => {
    setFavorites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleStrategy = useCallback(
    (id: StrategyId) => {
      const has = favorites.strategies.includes(id);
      persist({
        ...favorites,
        strategies: has
          ? favorites.strategies.filter((s) => s !== id)
          : [...favorites.strategies, id],
      });
    },
    [favorites, persist]
  );

  const toggleTicker = useCallback(
    (ticker: string) => {
      const has = favorites.tickers.includes(ticker);
      persist({
        ...favorites,
        tickers: has
          ? favorites.tickers.filter((t) => t !== ticker)
          : [...favorites.tickers, ticker],
      });
    },
    [favorites, persist]
  );

  return { favorites, toggleStrategy, toggleTicker };
}
