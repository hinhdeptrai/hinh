import { NextRequest, NextResponse } from "next/server"
import { BotTrader } from "@/lib/bot/trader"

// Global trader instance
let trader: BotTrader | null = null

function getTrader(): BotTrader {
  if (!trader) {
    trader = BotTrader.getInstance()
  }
  return trader
}

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const trader = getTrader()
    const stats = trader.getWinRateStats()
    const history = trader.getTradeHistory()
    
    return NextResponse.json({
      success: true,
      stats,
      history: history.slice(-20), // Last 20 trades
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Bot Stats] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get stats' },
      { status: 500 }
    )
  }
}
