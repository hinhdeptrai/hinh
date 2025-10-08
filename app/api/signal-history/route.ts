import { NextRequest } from "next/server"
import { getSignalHistory, getSignalStats, query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol")
  const timeframe = searchParams.get("timeframe") || undefined
  const limit = Number(searchParams.get("limit") || 50)
  const statsOnly = searchParams.get("stats") === "true"

  try {
    // If no symbol, get all signals
    if (!symbol) {
      console.log("Getting all signals, limit:", limit);

      // Check if table exists first
      const checkTable = await query(`SHOW TABLES LIKE 'signal_history'`);
      console.log("Table check:", checkTable);

      const sql = `SELECT * FROM signal_history ORDER BY entry_time DESC LIMIT ${limit}`;
      const allSignals = await query(sql, []);
      console.log("Found signals:", Array.isArray(allSignals) ? allSignals.length : 0, allSignals);
      return Response.json(allSignals, { status: 200 });
    }

    if (statsOnly) {
      const stats = await getSignalStats(symbol, timeframe)
      return Response.json(stats, { status: 200 })
    } else {
      const history = await getSignalHistory(symbol, timeframe, limit)
      return Response.json(history, { status: 200 })
    }
  } catch (e: any) {
    return Response.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
