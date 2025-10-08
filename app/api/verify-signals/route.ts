import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// Verify signals against Binance API
export async function POST(req: NextRequest) {
  try {
    // Get all ACTIVE signals from database
    const signals = await query<any[]>(
      "SELECT * FROM signal_history WHERE status = 'ACTIVE' ORDER BY entry_time DESC"
    );

    if (signals.length === 0) {
      return NextResponse.json({ message: "No active signals to verify" });
    }

    const results = [];

    for (const signal of signals) {
      try {
        // entry_time is now stored as BIGINT (milliseconds since epoch)
        // Can be returned as number or string depending on MySQL driver
        const entryTime = typeof signal.entry_time === 'number'
          ? signal.entry_time
          : parseInt(String(signal.entry_time), 10);

        console.log(`\n=== Verifying signal ${signal.id} ===`);
        console.log('Signal info:', {
          symbol: signal.symbol,
          timeframe: signal.timeframe,
          entry_time_raw: signal.entry_time,
          entry_time_parsed: new Date(entryTime).toISOString(),
          entry_time_ms: entryTime
        });

        // Fetch klines around the entry time
        // Get candles in a range: startTime to endTime
        const interval = signal.timeframe;
        const intervalMs = getIntervalMs(interval);

        // Fetch 100 candles before and 100 after entry time
        const startTime = entryTime - (intervalMs * 100);
        const endTime = entryTime + (intervalMs * 100);

        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${signal.symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=500`
        );

        if (!res.ok) {
          console.error(`Failed to fetch klines for ${signal.symbol}:`, res.status);
          continue;
        }

        const klines = await res.json();

        // Find the exact matching candle or closest candle to entry_time
        let exactMatch = null;
        let closestCandle = null;
        let minTimeDiff = Infinity;

        for (const kline of klines) {
          const candleTime = kline[0]; // Open time
          const timeDiff = Math.abs(candleTime - entryTime);

          // Check for exact match first
          if (timeDiff === 0) {
            exactMatch = {
              time: candleTime,
              open: parseFloat(kline[1]),
              high: parseFloat(kline[2]),
              low: parseFloat(kline[3]),
              close: parseFloat(kline[4]),
            };
            break;
          }

          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestCandle = {
              time: candleTime,
              open: parseFloat(kline[1]),
              high: parseFloat(kline[2]),
              low: parseFloat(kline[3]),
              close: parseFloat(kline[4]),
            };
          }
        }

        // Prefer exact match
        if (exactMatch) {
          closestCandle = exactMatch;
          minTimeDiff = 0;
          console.log('✓ Found EXACT match!');
        } else if (closestCandle) {
          console.log('Found closest candle:', {
            candleTime: new Date(closestCandle.time).toISOString(),
            timeDiffMs: minTimeDiff,
            timeDiffMinutes: (minTimeDiff / 60000).toFixed(2)
          });
        }

        if (!closestCandle) {
          // NOT_FOUND - no matching candle
          await query(
            `UPDATE signal_history SET status = 'NOT_FOUND' WHERE id = ?`,
            [signal.id]
          );
          results.push({
            id: signal.id,
            symbol: signal.symbol,
            status: "NOT_FOUND",
            reason: "No candles found in time range",
          });
          continue;
        }

        // Check if time difference is within acceptable tolerance (e.g., 1 minute for 1m TF, 60 minutes for 1h TF)
        const toleranceMs = getToleranceMs(signal.timeframe);

        if (minTimeDiff <= toleranceMs) {
          // MATCHED - found matching candle
          console.log(`Signal ${signal.id} MATCHED:`, {
            entryTime: new Date(entryTime).toISOString(),
            candleTime: new Date(closestCandle.time).toISOString(),
            timeDiffMs: minTimeDiff,
            timeDiffMinutes: (minTimeDiff / 60000).toFixed(2),
          });

          await query(
            `UPDATE signal_history SET status = 'MATCHED', binance_candle_time = ? WHERE id = ?`,
            [closestCandle.time, signal.id]
          );

          results.push({
            id: signal.id,
            symbol: signal.symbol,
            status: "MATCHED",
            entryTime: new Date(entryTime).toISOString(),
            candleTime: new Date(closestCandle.time).toISOString(),
            timeDiff: minTimeDiff,
            timeDiffMinutes: (minTimeDiff / 60000).toFixed(2),
          });
        } else {
          // NOT_FOUND - time difference too large
          await query(
            `UPDATE signal_history SET status = 'NOT_FOUND' WHERE id = ?`,
            [signal.id]
          );
          results.push({
            id: signal.id,
            symbol: signal.symbol,
            status: "NOT_FOUND",
            reason: `Time difference too large: ${(minTimeDiff / 60000).toFixed(2)} minutes`,
            entryTime: new Date(entryTime).toISOString(),
            closestCandleTime: new Date(closestCandle.time).toISOString(),
          });
        }
      } catch (error: any) {
        console.error(`Error verifying signal ${signal.id}:`, error.message);
        results.push({
          id: signal.id,
          symbol: signal.symbol,
          status: "ERROR",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalSignals: signals.length,
      results,
      summary: {
        matched: results.filter((r) => r.status === "MATCHED").length,
        notFound: results.filter((r) => r.status === "NOT_FOUND").length,
        errors: results.filter((r) => r.status === "ERROR").length,
      },
    });
  } catch (error: any) {
    console.error("Error in verify-signals:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get interval duration in milliseconds
function getIntervalMs(timeframe: string): number {
  const map: Record<string, number> = {
    "1m": 60000, // 1 minute
    "3m": 180000, // 3 minutes
    "5m": 300000, // 5 minutes
    "15m": 900000, // 15 minutes
    "30m": 1800000, // 30 minutes
    "1h": 3600000, // 1 hour
    "2h": 7200000, // 2 hours
    "4h": 14400000, // 4 hours
    "6h": 21600000, // 6 hours
    "8h": 28800000, // 8 hours
    "12h": 43200000, // 12 hours
    "1d": 86400000, // 1 day
  };
  return map[timeframe] || 3600000; // Default: 1 hour
}

// Get tolerance in milliseconds based on timeframe
function getToleranceMs(timeframe: string): number {
  // Tolerance should be very small - just a few seconds for matching exact candle
  // We're looking for exact candle match, not approximate time
  return 5000; // 5 seconds tolerance for timestamp comparison
}
