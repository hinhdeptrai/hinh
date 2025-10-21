import { NextRequest } from "next/server"
import { query } from "@/lib/db"
import { getTradeLogger } from "@/lib/exchange/logger"

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Fetch current price from Binance
async function fetchCurrentPrice(symbol: string): Promise<number> {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    const data = await res.json()
    return parseFloat(data.price)
  } catch (err) {
    console.error(`Failed to fetch price for ${symbol}:`, err)
    return 0
  }
}

// Check if TP or SL is hit and update outcome
async function checkAndUpdatePosition(trade: any) {
  const currentPrice = await fetchCurrentPrice(trade.symbol)
  if (!currentPrice) return null

  const entry = Number(trade.entry_price)
  const sl = Number(trade.sl_price)
  const tp1 = Number(trade.tp1_price)
  const side = trade.signal_type

  let outcome = null
  let outcomePrice = currentPrice

  // Check for BUY positions
  if (side === 'BUY') {
    if (currentPrice >= tp1) {
      outcome = 'TP1'
    } else if (currentPrice <= sl) {
      outcome = 'SL'
    }
  }
  // Check for SELL positions
  else if (side === 'SELL') {
    if (currentPrice <= tp1) {
      outcome = 'TP1'
    } else if (currentPrice >= sl) {
      outcome = 'SL'
    }
  }

  // Update if outcome detected
  if (outcome) {
    const exitTime = Date.now()
    // compute pnl using stored size if present
    const size = Number(trade.size || 0)
    const pnl = size > 0
      ? (side === 'BUY' ? (outcomePrice - entry) * size : (entry - outcomePrice) * size)
      : 0
    await query(`
      UPDATE signal_history 
      SET outcome = ?, outcome_price = ?, exit_time = ?, pnl = ?
      WHERE id = ?
    `, [outcome, outcomePrice, exitTime, pnl, trade.id])

    // Log the exit
    const logger = getTradeLogger()

    await logger.logWithAlert({
      timestamp: exitTime,
      symbol: trade.symbol,
      action: outcome === 'SL' ? 'sl' : 'tp',
      side: side.toLowerCase() as 'buy' | 'sell',
      price: outcomePrice,
      size: size || 0,
      orderId: `exit_${trade.id}`,
      pnl,
    }, outcome === 'SL') // Alert on SL

    return {
      id: trade.id,
      symbol: trade.symbol,
      outcome,
      currentPrice,
      entry,
      sl,
      tp1,
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  try {
    // Get all pending positions (no outcome yet)
    const pendingTrades = await query(`
      SELECT 
        id, symbol, signal_type, entry_price, sl_price, tp1_price, entry_time, size
      FROM signal_history 
      WHERE (outcome IS NULL OR outcome = 'NONE')
      AND entry_price > 0
      ORDER BY entry_time DESC
      LIMIT 50
    `)

    const results = []
    for (const trade of pendingTrades as any[]) {
      const result = await checkAndUpdatePosition(trade)
      if (result) {
        results.push(result)
      }
    }

    return Response.json({
      success: true,
      checked: pendingTrades.length,
      updated: results.length,
      results,
    }, { status: 200 })

  } catch (e: any) {
    console.error("Monitor positions error:", e)
    return Response.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    )
  }
}

