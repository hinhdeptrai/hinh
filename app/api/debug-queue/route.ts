import { NextRequest } from "next/server"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    // Get all signals from queue with details
    const allSignals = await query(`
      SELECT
        id, symbol, timeframe, signal_type, status,
        signal_time, candle_close_time,
        created_at,
        FROM_UNIXTIME(signal_time/1000) as signal_time_readable,
        FROM_UNIXTIME(candle_close_time/1000) as candle_close_time_readable
      FROM signal_queue
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const now = Date.now();
    const nowReadable = new Date(now).toISOString();

    // Get count by status
    const statusCounts = await query(`
      SELECT status, COUNT(*) as count
      FROM signal_queue
      GROUP BY status
    `);

    return Response.json({
      success: true,
      current_time: now,
      current_time_readable: nowReadable,
      total_signals: allSignals.length,
      signals: allSignals,
      status_counts: statusCounts,
    }, { status: 200 });

  } catch (e: any) {
    console.error("Debug queue error:", e);
    return Response.json(
      { error: e?.message || "Unknown error", stack: e?.stack },
      { status: 500 }
    );
  }
}
