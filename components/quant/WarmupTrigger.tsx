"use client";

import { useEffect, useRef } from "react";

/** 앱 어디서든 한 번 퀀트 캐시 워밍을 트리거합니다. */
export default function WarmupTrigger() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch("/api/quant/warmup", { method: "GET", cache: "no-store" }).catch(
      () => {}
    );
  }, []);

  return null;
}
