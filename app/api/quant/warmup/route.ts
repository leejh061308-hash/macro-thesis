import { NextResponse } from "next/server";
import {
  ensureQuantCacheWarm,
  getQuantCacheStatus,
} from "@/lib/quant/warmup";

export async function GET() {
  const status = getQuantCacheStatus();

  if (status === "ready") {
    return NextResponse.json({ status: "ready" });
  }

  if (status === "cold") {
    void ensureQuantCacheWarm();
  }

  return NextResponse.json({ status: "warming" });
}

/** 클라이언트가 워밍 완료까지 기다릴 때 */
export async function POST() {
  try {
    await ensureQuantCacheWarm();
    return NextResponse.json({ status: "ready" });
  } catch (error) {
    console.error("[quant/warmup]", error);
    return NextResponse.json(
      { status: "error", error: "퀀트 데이터 준비에 실패했습니다." },
      { status: 500 }
    );
  }
}
