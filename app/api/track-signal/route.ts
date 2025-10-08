import { NextRequest } from "next/server"
import { storeSignal, updateSignalOutcome, SignalHistoryRecord } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("Track signal API received:", body);

    const { action } = body

    if (action === "store") {
      // Store new signal
      const record: SignalHistoryRecord = {
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
        entry_time: body.entry_time || new Date().toISOString(),
        is_fresh: body.is_fresh || false,
        volume_confirmed: body.volume_confirmed || false,
      }

      console.log("Storing signal record:", record);
      console.log("Entry time (ISO):", record.entry_time);
      console.log("Entry time (timestamp):", new Date(record.entry_time).getTime());
      const result = await storeSignal(record);
      console.log("Store signal result:", result);

      return Response.json({ success: true, message: "Signal stored", result }, { status: 200 })
    } else if (action === "update") {
      // Update signal outcome
      console.log("Updating signal outcome:", body);
      await updateSignalOutcome(
        body.symbol,
        body.timeframe,
        body.entry_time,
        body.outcome,
        body.outcome_price,
        body.exit_time || new Date().toISOString(),
        body.bars_duration
      )
      return Response.json({ success: true, message: "Signal updated" }, { status: 200 })
    } else {
      return Response.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (e: any) {
    console.error("Track signal API error:", e);
    return Response.json({ error: e?.message || "Unknown error", stack: e?.stack }, { status: 500 })
  }
}
