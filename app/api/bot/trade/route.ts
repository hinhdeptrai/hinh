import { NextRequest, NextResponse } from "next/server"
import { BotTrader } from "@/lib/bot/trader"
import { Signal } from "@/lib/bot/types"

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
    const body = await req.json()
    const signal: Signal = body
    
    const trader = getTrader()
    const result = await trader.processSignal(signal)
    
    return NextResponse.json({
      success: result.success,
      reason: result.reason,
      position: result.position
    })
  } catch (error: any) {
    console.error('[Bot Trade] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Trade failed' },
      { status: 500 }
    )
  }
}
