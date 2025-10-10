import { NextRequest } from "next/server"
import {
  getPendingQueueSignals,
  updateQueueSignalStatus,
  storeSignal,
  getQueueStats,
  SignalQueueRecord,
  SignalHistoryRecord,
} from "@/lib/db"

// Parse timeframe to milliseconds
function timeframeToMs(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([mhd])$/i);
  if (!match) return 60000; // default 1m
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
}

// Fetch klines from Binance
async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number
): Promise<any[]> {
  const url = new URL('https://fapi.binance.com/fapi/v1/klines');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('startTime', startTime.toString());
  url.searchParams.set('endTime', endTime.toString());
  url.searchParams.set('limit', '10');

  console.log('Fetching Binance klines:', {
    symbol,
    interval,
    startTime,
    endTime,
    startTimeISO: new Date(startTime).toISOString(),
    endTimeISO: new Date(endTime).toISOString(),
    url: url.toString()
  });

  const response = await fetch(url.toString());

  console.log('Binance response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Binance API error response:', errorText);
    throw new Error(`Binance API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Binance klines received:', data.length, 'candles');
  return data;
}

// Process a single queued signal
async function processQueuedSignal(queuedSignal: SignalQueueRecord) {
  try {
    const signalTime = typeof queuedSignal.signal_time === 'number' 
      ? queuedSignal.signal_time 
      : new Date(queuedSignal.signal_time).getTime();
    
    const intervalMs = timeframeToMs(queuedSignal.timeframe);
    
    // Fetch klines around signal time
    const startTime = signalTime - intervalMs * 2;
    const endTime = signalTime + intervalMs * 2;
    
    const klines = await fetchBinanceKlines(
      queuedSignal.symbol,
      queuedSignal.timeframe,
      startTime,
      endTime
    );

    if (!klines || klines.length === 0) {
      throw new Error('No klines data received from Binance');
    }

    // Find the candle that matches the signal time
    const matchingCandle = klines.find((k: any) => {
      const openTime = parseInt(k[0]);
      return openTime === signalTime;
    });

    if (!matchingCandle) {
      throw new Error(`No matching candle found for signal time ${new Date(signalTime).toISOString()}`);
    }

    // Use the candle close price as entry price
    const candleClosePrice = parseFloat(matchingCandle[4]);
    
    // Create signal history record
    const historyRecord: SignalHistoryRecord = {
      symbol: queuedSignal.symbol,
      timeframe: queuedSignal.timeframe,
      signal_type: queuedSignal.signal_type,
      indicator_type: queuedSignal.indicator_type,
      entry_price: candleClosePrice, // Use actual close price from Binance
      sl_price: queuedSignal.sl_price,
      tp1_price: queuedSignal.tp1_price,
      tp2_price: queuedSignal.tp2_price,
      tp3_price: queuedSignal.tp3_price,
      tp4_price: queuedSignal.tp4_price,
      tp5_price: queuedSignal.tp5_price,
      tp6_price: queuedSignal.tp6_price,
      entry_time: new Date(signalTime), // Convert to Date
      is_fresh: queuedSignal.is_fresh,
      volume_confirmed: queuedSignal.volume_confirmed,
      binance_candle_time: new Date(signalTime), // Convert to Date
    };

    // Store in signal history
    await storeSignal(historyRecord);

    // Update queue status
    await updateQueueSignalStatus(queuedSignal.id!, 'PROCESSED');

    return {
      id: queuedSignal.id,
      symbol: queuedSignal.symbol,
      status: 'PROCESSED',
      entry_time: new Date(signalTime).toISOString(),
      entry_price: candleClosePrice,
    };

  } catch (error: any) {
    console.error(`Failed to process queue signal ${queuedSignal.id}:`, error);
    
    // Update queue status to failed
    await updateQueueSignalStatus(
      queuedSignal.id!,
      'FAILED',
      error.message || 'Unknown error'
    );

    return {
      id: queuedSignal.id,
      symbol: queuedSignal.symbol,
      status: 'FAILED',
      error: error.message,
    };
  }
}

// GET: Process all pending signals (for cron)
export async function GET(req: NextRequest) {
  try {
    console.log('Processing signal queue...');
    
    const pendingSignals = await getPendingQueueSignals();
    console.log(`Found ${pendingSignals.length} pending signals`);

    if (pendingSignals.length === 0) {
      const stats = await getQueueStats();
      return Response.json({
        success: true,
        message: "No pending signals to process",
        processed: 0,
        failed: 0,
        results: [],
        stats,
      }, { status: 200 });
    }

    // Process all pending signals
    const results = await Promise.all(
      pendingSignals.map(signal => processQueuedSignal(signal))
    );

    const processed = results.filter(r => r.status === 'PROCESSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;

    const stats = await getQueueStats();

    console.log(`Processed: ${processed}, Failed: ${failed}`);

    return Response.json({
      success: true,
      message: `Processed ${processed} signals`,
      processed,
      failed,
      results,
      stats,
    }, { status: 200 });

  } catch (e: any) {
    console.error("Process queue error:", e);
    return Response.json(
      { error: e?.message || "Unknown error", stack: e?.stack },
      { status: 500 }
    );
  }
}
