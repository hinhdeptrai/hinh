import { NextRequest, NextResponse } from "next/server"
import { BotScanner } from "@/lib/bot/scanner"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const scanner = new BotScanner()
    const result = await scanner.scanAndTrade()
    
    return NextResponse.json({
      success: true,
      scanned: result.scanned,
      signals_found: result.signals.length,
      trades_executed: result.trades.length,
      signals: result.signals,
      trades: result.trades,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Bot Scan] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Scan failed' },
      { status: 500 }
    )
  }
}
