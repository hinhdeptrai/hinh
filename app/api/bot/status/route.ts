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
    const status = trader.getStatus()
    
    return NextResponse.json(status)
  } catch (error: any) {
    console.error('[Bot Status] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    )
  }
}
