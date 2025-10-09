import { NextRequest } from "next/server"
import { addSignalToQueue, SignalQueueRecord } from "@/lib/db"

// Parse timeframe to milliseconds
function timeframeToMs(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([mhd])$/i);
  if (!match) throw new Error(`Invalid timeframe format: ${timeframe}`);
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unknown timeframe unit: ${unit}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Queue signal API received:", body);

    const {
      symbol,
      timeframe,
      signal_type,
      entry_price,
      sl_price,
      tp1_price,
      tp2_price,
      tp3_price,
      tp4_price,
      tp5_price,
      tp6_price,
      signal_time,
      is_fresh,
      volume_confirmed,
    } = body;

    // Validate required fields
    if (!symbol || !timeframe || !signal_type || !entry_price || !signal_time) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate candle close time
    const signalTimeMs = new Date(signal_time).getTime();
    const intervalMs = timeframeToMs(timeframe);
    const candleCloseTime = signalTimeMs + intervalMs;

    const record: SignalQueueRecord = {
      symbol,
      timeframe,
      signal_type,
      entry_price,
      sl_price,
      tp1_price,
      tp2_price,
      tp3_price,
      tp4_price,
      tp5_price,
      tp6_price,
      signal_time: signalTimeMs,
      candle_close_time: candleCloseTime,
      is_fresh: is_fresh || false,
      volume_confirmed: volume_confirmed || false,
    };

    console.log("Adding signal to queue:", record);
    const result = await addSignalToQueue(record);
    console.log("Queue signal result:", result);

    // Calculate wait time
    const now = Date.now();
    const waitTimeMs = candleCloseTime - now;
    const waitTimeMinutes = (waitTimeMs / 1000 / 60).toFixed(1);

    return Response.json({
      success: true,
      message: "Signal added to queue",
      data: {
        candle_close_time_iso: new Date(candleCloseTime).toISOString(),
        wait_time_minutes: waitTimeMinutes,
      },
    }, { status: 200 });

  } catch (e: any) {
    console.error("Queue signal API error:", e);
    return Response.json(
      { error: e?.message || "Unknown error", stack: e?.stack },
      { status: 500 }
    );
  }
}
