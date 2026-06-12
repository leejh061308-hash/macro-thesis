"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedScreenerPreset, ScreenerRequest } from "@/lib/screener/types";

const STORAGE_KEY = "macrolens-screener-presets";

export function useScreenerPresets() {
  const [presets, setPresets] = useState<SavedScreenerPreset[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPresets(JSON.parse(raw) as SavedScreenerPreset[]);
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((next: SavedScreenerPreset[]) => {
    setPresets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const savePreset = useCallback(
    (name: string, request: ScreenerRequest) => {
      const preset: SavedScreenerPreset = {
        id: crypto.randomUUID(),
        name: name.trim(),
        request,
        createdAt: new Date().toISOString(),
      };
      persist([preset, ...presets].slice(0, 20));
      return preset;
    },
    [persist, presets]
  );

  const removePreset = useCallback(
    (id: string) => {
      persist(presets.filter((p) => p.id !== id));
    },
    [persist, presets]
  );

  return { presets, savePreset, removePreset };
}
