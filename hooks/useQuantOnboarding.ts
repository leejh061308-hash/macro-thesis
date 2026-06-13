"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "macrolens-quant-onboarding-v1";

export function useQuantOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setShowOnboarding(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const reopenOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  return {
    showOnboarding: hydrated && showOnboarding,
    dismissOnboarding,
    reopenOnboarding,
  };
}
