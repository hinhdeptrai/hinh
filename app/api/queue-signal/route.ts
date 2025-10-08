import { NextRequest } from "next/server";
import { addToSignalQueue, SignalQueueRecord } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Queue signal API received:", body);

    // Calculate candle close time based on timeframe
    const calculateCandleCloseTime = (signalTime: number, timeframe: string): number => {
      const intervals: Record<string, number> = {
        "1m": 60000,
        "3m": 180000,
        "5m": 300000,
        "15m": 900000,
        "30m": 1800000,
        "1h": 3600000,
        "2h": 7200000,
        "4h": 14400000,
        "6h": 21600000,
        "8h": 28800000,
        "12h": 43200000,
        "1d": 86400000,
      };

      const intervalMs = intervals[timeframe] || 3600000;

      // Find the next candle close time
      // Candle opens at: floor(signalTime / intervalMs) * intervalMs
      // Candle closes at: open + intervalMs
      const candleOpenTime = Math.floor(signalTime / intervalMs) * intervalMs;
      const candleCloseTime = candleOpenTime + intervalMs;

      return candleCloseTime;
    };

    const signalTime = body.signal_time
      ? (typeof body.signal_time === 'number' ? body.signal_time : new Date(body.signal_time).getTime())
      : Date.now();

    const candleCloseTime = calculateCandleCloseTime(signalTime, body.timeframe);

    const record: SignalQueueRecord = {
      symbol: body.symbol,
      timeframe: body.timeframe,
      signal_type: body.signal_type,
      entry_price: body.entry_price,
      sl_price: body.sl_price,
      tp1_price: body.tp1_price,
      tp2_price: body.tp2_price,
      tp3_price: body.tp3_price,
      tp4_price: body.tp4_price,
      tp5_price: body.tp5_price,
      tp6_price: body.tp6_price,
      signal_time: signalTime,
      candle_close_time: candleCloseTime,
      is_fresh: body.is_fresh || false,
      volume_confirmed: body.volume_confirmed || false,
    };

    console.log("Adding signal to queue:", {
      ...record,
      signal_time_iso: new Date(record.signal_time).toISOString(),
      candle_close_time_iso: new Date(record.candle_close_time).toISOString(),
      wait_time_minutes: ((candleCloseTime - Date.now()) / 60000).toFixed(2),
    });

    const result = await addToSignalQueue(record);
    console.log("Signal queued successfully:", result);

    return Response.json({
      success: true,
      message: "Signal added to queue",
      data: {
        ...record,
        candle_close_time_iso: new Date(candleCloseTime).toISOString(),
        wait_time_minutes: ((candleCloseTime - Date.now()) / 60000).toFixed(2),
      },
      result,
    }, { status: 200 });
  } catch (e: any) {
    console.error("Queue signal API error:", e);
    return Response.json({
      error: e?.message || "Unknown error",
      stack: e?.stack,
    }, { status: 500 });
  }
}
