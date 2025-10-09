import { NextRequest } from "next/server"
import { getPendingQueueSignals, getQueueStats } from "@/lib/db"

// GET: Check queue status without processing
export async function GET(req: NextRequest) {
  try {
    const stats = await getQueueStats();
    const pendingSignals = await getPendingQueueSignals(10);
    
    const now = Date.now();
    const readyToProcess = pendingSignals.filter(s => {
      const closeTime = typeof s.candle_close_time === 'number' 
        ? s.candle_close_time 
        : new Date(s.candle_close_time).getTime();
      return closeTime <= now;
    }).length;

    return Response.json({
      success: true,
      stats,
      ready_to_process: readyToProcess,
      pending_signals: pendingSignals.map(s => {
        const closeTime = typeof s.candle_close_time === 'number' 
          ? s.candle_close_time 
          : new Date(s.candle_close_time).getTime();
        const waitTimeMs = closeTime - now;
        const waitTimeMinutes = (waitTimeMs / 1000 / 60).toFixed(1);
        
        return {
          id: s.id,
          symbol: s.symbol,
          timeframe: s.timeframe,
          signal_type: s.signal_type,
          candle_close_time: new Date(closeTime).toISOString(),
          wait_time_minutes: waitTimeMinutes,
        };
      }),
    }, { status: 200 });

  } catch (e: any) {
    console.error("Queue status error:", e);
    return Response.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
