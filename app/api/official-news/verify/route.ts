import { NextRequest, NextResponse } from "next/server";
import { getAdminKeyFromRequest, verifyAdminKey } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const headerKey = getAdminKeyFromRequest(request);
    const bodyKey =
      typeof body.key === "string" ? body.key.trim() : "";
    const key = headerKey ?? bodyKey;

    return NextResponse.json({ canWrite: verifyAdminKey(key) });
  } catch {
    return NextResponse.json({ canWrite: false });
  }
}
