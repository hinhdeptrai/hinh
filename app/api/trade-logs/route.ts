import { NextRequest } from "next/server"
import { getTradeLogger } from "@/lib/exchange/logger"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const logger = getTradeLogger()
    const logs = logger.getRecentLogs(50)
    const performance = logger.getPerformance()
    
    return Response.json({
      success: true,
      logs,
      performance,
    }, { status: 200 })
    
  } catch (e: any) {
    console.error("Trade logs error:", e)
    return Response.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    )
  }
}

