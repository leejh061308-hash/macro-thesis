"use client";

import { useEffect } from "react";

export function useAutoRefresh(
  callback: () => void,
  intervalMs: number,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };

    const id = setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [callback, intervalMs, enabled]);
}
