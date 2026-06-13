"use client";

import QuantPanel from "@/components/quant/QuantPanel";
import QuantOnboarding from "@/components/onboarding/QuantOnboarding";
import ViewModeToggle from "@/components/quant/ViewModeToggle";
import { useQuantOnboarding } from "@/hooks/useQuantOnboarding";
import { useQuantViewMode } from "@/hooks/useQuantViewMode";

export default function QuantPageClient() {
  const { showOnboarding, dismissOnboarding, reopenOnboarding } =
    useQuantOnboarding();
  const { mode, setMode, hydrated } = useQuantViewMode();

  return (
    <>
      <QuantOnboarding open={showOnboarding} onClose={dismissOnboarding} />

      {hydrated ? (
        <div className="space-y-2">
          <ViewModeToggle mode={mode} onChange={setMode} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={reopenOnboarding}
              className="text-[11px] text-neutral underline-offset-2 hover:text-gray-300 hover:underline"
            >
              퀀트 도움말
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="h-20 animate-pulse rounded-xl bg-surface-border/40" />
          <div className="h-20 animate-pulse rounded-xl bg-surface-border/40" />
        </div>
      )}

      <QuantPanel mode={mode} modeHydrated={hydrated} />
    </>
  );
}
