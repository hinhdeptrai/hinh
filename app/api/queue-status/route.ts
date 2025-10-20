import { NextRequest } from "next/server"
import { query } from "@/lib/db"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const now = Date.now()
    
    // Get all queue signals with details
    const allSignals = await query(`
      SELECT 
        id, 
        symbol, 
        timeframe,
        signal_type,
        status, 
        signal_time,
        candle_close_time,
        error_message,
        created_at,
        CASE 
          WHEN candle_close_time <= ? THEN 'READY'
          ELSE 'WAITING'
        END as ready_status,
        ROUND((candle_close_time - ?) / 1000 / 60, 1) as minutes_until_close
      FROM signal_queue 
      ORDER BY candle_close_time ASC 
      LIMIT 50
    `, [now, now])
    
    // Get stats
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'PROCESSED' THEN 1 ELSE 0 END) as processed,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'PENDING' AND candle_close_time <= ? THEN 1 ELSE 0 END) as ready_to_process
      FROM signal_queue
    `, [now])
    
    return Response.json({
      success: true,
      currentTime: now,
      currentTimeISO: new Date(now).toISOString(),
      stats: stats[0],
      signals: allSignals,
    }, { status: 200 })
    
  } catch (e: any) {
    console.error("Queue status error:", e)
    return Response.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    )
  }
}
