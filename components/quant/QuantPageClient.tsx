"use client";

import QuantPanel from "@/components/quant/QuantPanel";
import QuantOnboarding from "@/components/onboarding/QuantOnboarding";
import { useQuantOnboarding } from "@/hooks/useQuantOnboarding";

export default function QuantPageClient() {
  const { showOnboarding, dismissOnboarding, reopenOnboarding } =
    useQuantOnboarding();

  return (
    <>
      <QuantOnboarding open={showOnboarding} onClose={dismissOnboarding} />
      <QuantPanel onHelpClick={reopenOnboarding} />
    </>
  );
}
