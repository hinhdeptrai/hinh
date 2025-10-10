import { NextRequest } from "next/server"
import { query, ensureSignalQueueSchema } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    // Ensure schema
    await ensureSignalQueueSchema();

    // Check if table exists
    const tables = await query(`SHOW TABLES LIKE 'signal_queue'`);

    // Get table structure
    const structure = await query(`DESCRIBE signal_queue`);

    // Get all records
    const allRecords = await query(`SELECT * FROM signal_queue ORDER BY created_at DESC LIMIT 10`);

    // Get counts by status
    const counts = await query(`
      SELECT
        status,
        COUNT(*) as count
      FROM signal_queue
      GROUP BY status
    `);

    // Get pending signals that should be processed
    const now = Date.now();
    const readyToProcess = await query(`
      SELECT * FROM signal_queue
      WHERE status = 'PENDING' AND candle_close_time <= ?
      ORDER BY candle_close_time ASC
      LIMIT 10
    `, [now]);

    return Response.json({
      success: true,
      debug: {
        tableExists: Array.isArray(tables) && tables.length > 0,
        structure,
        allRecords,
        counts,
        readyToProcess,
        currentTime: now,
        currentTimeISO: new Date(now).toISOString(),
      }
    }, { status: 200 });

  } catch (e: any) {
    return Response.json({
      error: e?.message || "Unknown error",
      stack: e?.stack
    }, { status: 500 });
  }
}
