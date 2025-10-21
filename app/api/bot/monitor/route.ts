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

export async function POST(req: NextRequest) {
  try {
    const trader = getTrader()
    const result = await trader.monitorPositions()
    
    return NextResponse.json({
      success: true,
      checked: result.checked,
      updated: result.updated,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Bot Monitor] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Monitor failed' },
      { status: 500 }
    )
  }
}
