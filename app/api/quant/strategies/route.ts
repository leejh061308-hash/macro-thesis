import { NextResponse } from "next/server";
import { STRATEGIES } from "@/lib/quant/strategies";
import { isMetricsAvailable } from "@/lib/quant/metrics-service";

export async function GET() {
  return NextResponse.json({
    strategies: STRATEGIES,
    metricsAvailable: isMetricsAvailable(),
  });
}
