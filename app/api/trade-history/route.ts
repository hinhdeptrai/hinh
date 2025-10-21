import { NextRequest } from "next/server"
import { query } from "@/lib/db"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const history = await query(`
      SELECT 
        id,
        symbol,
        timeframe,
        signal_type,
        indicator_type,
        entry_price,
        size,
        sl_price,
        tp1_price,
        outcome,
        outcome_price,
        pnl,
        order_id,
        exec_mode,
        entry_time,
        exit_time,
        bars_duration,
        is_fresh,
        volume_confirmed
      FROM signal_history 
      ORDER BY entry_time DESC 
      LIMIT 50
    `)
    
    return Response.json({
      success: true,
      history,
    }, { status: 200 })
    
  } catch (e: any) {
    console.error("Trade history error:", e)
    return Response.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    )
  }
}

