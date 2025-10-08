import { NextRequest, NextResponse } from "next/server";
import {
  getPendingQueueSignals,
  updateQueueSignalStatus,
  storeSignal,
  SignalHistoryRecord,
  getQueueStats,
} from "@/lib/db";
import {
  sendTelegramMessage,
  formatSignalNotification,
  formatQueueSummary,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Process pending signals in queue
 * This endpoint should be called by a cron job every minute
 */
export async function POST(req: NextRequest) {
  try {
    console.log("\n=== Processing Signal Queue ===");
    console.log("Current time:", new Date().toISOString());

    // Get all pending signals that are ready to be processed
    const pendingSignals = await getPendingQueueSignals();

    console.log(`Found ${pendingSignals.length} signals ready to process`);

    if (pendingSignals.length === 0) {
      const stats = await getQueueStats();
      return NextResponse.json({
        success: true,
        message: "No signals to process",
        processed: 0,
        stats,
      });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const queueSignal of pendingSignals) {
      try {
        console.log(`\nProcessing queued signal #${queueSignal.id}:`, {
          symbol: queueSignal.symbol,
          timeframe: queueSignal.timeframe,
          signal_type: queueSignal.signal_type,
          signal_time: new Date(queueSignal.signal_time).toISOString(),
          candle_close_time: new Date(queueSignal.candle_close_time).toISOString(),
        });

        // Fetch latest candle data to get the actual closed candle info
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${queueSignal.symbol}&interval=${queueSignal.timeframe}&limit=2`
        );

        if (!res.ok) {
          throw new Error(`Binance API error: ${res.status}`);
        }

        const klines = await res.json();

        if (klines.length < 2) {
          throw new Error("Not enough candle data");
        }

        // Get the previous closed candle (index 0 is most recent, but might be current)
        // We want the candle that matches our signal_time
        const signalCandle = klines.find((k: any[]) => {
          const candleOpenTime = k[0];
          // Check if this candle contains our signal time
          return candleOpenTime === queueSignal.signal_time ||
                 Math.abs(candleOpenTime - queueSignal.signal_time) < 60000; // 1 min tolerance
        });

        const targetCandle = signalCandle || klines[1]; // Fallback to previous candle

        const candleOpenTime = targetCandle[0];
        const candleClose = parseFloat(targetCandle[4]);

        console.log("Using candle data:", {
          openTime: new Date(candleOpenTime).toISOString(),
          close: candleClose,
        });

        // Create signal history record
        const historyRecord: SignalHistoryRecord = {
          symbol: queueSignal.symbol,
          timeframe: queueSignal.timeframe,
          signal_type: queueSignal.signal_type,
          entry_price: candleClose, // Use actual close price
          sl_price: queueSignal.sl_price,
          tp1_price: queueSignal.tp1_price,
          tp2_price: queueSignal.tp2_price,
          tp3_price: queueSignal.tp3_price,
          tp4_price: queueSignal.tp4_price,
          tp5_price: queueSignal.tp5_price,
          tp6_price: queueSignal.tp6_price,
          entry_time: candleOpenTime, // Use candle open time (exact match with Binance)
          is_fresh: queueSignal.is_fresh,
          volume_confirmed: queueSignal.volume_confirmed,
        };

        // Store in signal history
        await storeSignal(historyRecord);

        // Mark as processed
        await updateQueueSignalStatus(queueSignal.id!, "PROCESSED");

        successCount++;

        const result = {
          id: queueSignal.id,
          symbol: queueSignal.symbol,
          signal_type: queueSignal.signal_type,
          status: "PROCESSED",
          entry_time: new Date(candleOpenTime).toISOString(),
          entry_price: candleClose,
        };

        results.push(result);

        console.log(`✓ Signal #${queueSignal.id} processed successfully`);

        // Send Telegram notification
        try {
          const telegramMessage = formatSignalNotification({
            symbol: queueSignal.symbol,
            signal_type: queueSignal.signal_type,
            entry_price: candleClose,
            sl_price: queueSignal.sl_price || undefined,
            tp1_price: queueSignal.tp1_price || undefined,
            tp2_price: queueSignal.tp2_price || undefined,
            tp3_price: queueSignal.tp3_price || undefined,
            tp4_price: queueSignal.tp4_price || undefined,
            tp5_price: queueSignal.tp5_price || undefined,
            tp6_price: queueSignal.tp6_price || undefined,
            timeframe: queueSignal.timeframe,
            entry_time: new Date(candleOpenTime).toISOString(),
            is_fresh: queueSignal.is_fresh,
            volume_confirmed: queueSignal.volume_confirmed,
          });

          await sendTelegramMessage(telegramMessage);
        } catch (telegramError: any) {
          console.error(`Failed to send Telegram for signal #${queueSignal.id}:`, telegramError.message);
          // Don't fail the whole process if Telegram fails
        }
      } catch (error: any) {
        console.error(`✗ Failed to process signal #${queueSignal.id}:`, error.message);

        // Mark as failed
        await updateQueueSignalStatus(queueSignal.id!, "FAILED");

        failCount++;
        results.push({
          id: queueSignal.id,
          symbol: queueSignal.symbol,
          status: "FAILED",
          error: error.message,
        });
      }
    }

    const stats = await getQueueStats();

    console.log("\n=== Queue Processing Summary ===");
    console.log(`Total processed: ${pendingSignals.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log("Queue stats:", stats);

    // Send summary notification to Telegram if there were any signals processed
    if (pendingSignals.length > 0) {
      try {
        const summaryMessage = formatQueueSummary({
          processed: successCount,
          failed: failCount,
          results,
        });
        await sendTelegramMessage(summaryMessage);
      } catch (error: any) {
        console.error("Failed to send summary to Telegram:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingSignals.length} signals`,
      processed: successCount,
      failed: failCount,
      results,
      stats,
    });
  } catch (error: any) {
    console.error("Error processing signal queue:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check queue status
export async function GET(req: NextRequest) {
  try {
    const stats = await getQueueStats();
    const pendingSignals = await getPendingQueueSignals();

    return NextResponse.json({
      success: true,
      stats,
      ready_to_process: pendingSignals.length,
      pending_signals: pendingSignals.map((s) => ({
        id: s.id,
        symbol: s.symbol,
        timeframe: s.timeframe,
        signal_type: s.signal_type,
        candle_close_time: new Date(s.candle_close_time).toISOString(),
        wait_time_minutes: ((s.candle_close_time - Date.now()) / 60000).toFixed(2),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
