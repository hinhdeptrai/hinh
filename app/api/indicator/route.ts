import { NextRequest } from "next/server"
import { getIndicator } from "@/lib/indicator"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol") || "BTCUSDT"
  const intervalsParam = searchParams.get("intervals") || "4h"
  const limit = Number(searchParams.get("limit") || 500)
  const intervals = intervalsParam.split(",").map((s) => s.trim()).filter(Boolean)

  try {
    const data = await getIndicator({ symbol, intervals, limit })
    return Response.json(data, { status: 200 })
  } catch (e: any) {
    return Response.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}

