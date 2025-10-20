import { NextRequest } from "next/server"
import { getTradeLogger } from "@/lib/exchange/logger"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const logger = getTradeLogger()
    
    // Create a test trade log entry
    await logger.logWithAlert({
      timestamp: Date.now(),
      symbol: 'BTCUSDT',
      action: 'entry',
      side: 'buy',
      price: 67500,
      size: 0.01,
      orderId: `test_${Date.now()}`,
    }, false)
    
    return Response.json({
      success: true,
      message: "Test trade logged",
    }, { status: 200 })
    
  } catch (e: any) {
    console.error("Test trade error:", e)
    return Response.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    )
  }
}

