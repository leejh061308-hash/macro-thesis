"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuantViewMode } from "@/lib/quant/basic-view";

const STORAGE_KEY = "quant-view-mode";

export function useQuantViewMode() {
  const [mode, setModeState] = useState<QuantViewMode>("basic");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "basic" || stored === "advanced") {
        setModeState(stored);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const setMode = useCallback((next: QuantViewMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  return { mode, setMode, hydrated };
}
