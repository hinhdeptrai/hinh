import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration script to convert TIMESTAMP columns to BIGINT
 * for precise millisecond storage matching Binance API timestamps
 */
export async function POST(req: NextRequest) {
  try {
    console.log("Starting signal_history table migration...");

    // Step 1: Check if table exists and get current schema
    const tables = await query<any[]>("SHOW TABLES LIKE 'signal_history'");
    if (tables.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Table signal_history does not exist",
      });
    }

    // Step 2: Get column info
    const columns = await query<any[]>("DESCRIBE signal_history");
    console.log("Current columns:", columns);

    // Step 3: Check if entry_time is already BIGINT
    const entryTimeCol = columns.find((col: any) => col.Field === "entry_time");
    if (entryTimeCol?.Type.includes("bigint")) {
      return NextResponse.json({
        success: true,
        message: "Table already migrated (entry_time is BIGINT)",
      });
    }

    // Step 4: Check which columns exist
    const columnNames = columns.map((col: any) => col.Field);
    console.log("Current columns:", columnNames);

    // Step 5: Clean up any partial migration
    const hasEntryTimeMs = columnNames.includes("entry_time_ms");
    const hasExitTimeMs = columnNames.includes("exit_time_ms");
    const hasBinanceCandleTimeMs = columnNames.includes("binance_candle_time_ms");

    if (hasEntryTimeMs || hasExitTimeMs || hasBinanceCandleTimeMs) {
      console.log("Cleaning up partial migration...");
      const dropCols = [];
      if (hasEntryTimeMs) dropCols.push("entry_time_ms");
      if (hasExitTimeMs) dropCols.push("exit_time_ms");
      if (hasBinanceCandleTimeMs) dropCols.push("binance_candle_time_ms");

      await query(`ALTER TABLE signal_history DROP COLUMN ${dropCols.join(", DROP COLUMN ")}`);
      console.log("Cleaned up:", dropCols);
    }

    // Step 6: Check if old columns are TIMESTAMP
    const entryTimeType = columns.find((col: any) => col.Field === "entry_time")?.Type;
    const isTimestamp = entryTimeType?.toLowerCase().includes("timestamp");

    if (!isTimestamp) {
      console.log("entry_time is not TIMESTAMP, checking if conversion needed...");
      // Already migrated or different type
      const hasBinanceCandleTime = columnNames.includes("binance_candle_time");
      if (!hasBinanceCandleTime) {
        console.log("Adding missing binance_candle_time column...");
        await query(`
          ALTER TABLE signal_history
          ADD COLUMN binance_candle_time BIGINT NULL COMMENT 'Unix timestamp in milliseconds'
        `);
      }

      const hasStatus = columnNames.includes("status");
      if (!hasStatus) {
        console.log("Adding missing status column...");
        await query(`
          ALTER TABLE signal_history
          ADD COLUMN status ENUM('ACTIVE', 'MATCHED', 'NOT_FOUND') DEFAULT 'ACTIVE'
        `);
      }

      return NextResponse.json({
        success: true,
        message: "Table structure verified and updated",
      });
    }

    // Step 7: Perform migration from TIMESTAMP to BIGINT
    console.log("Migrating from TIMESTAMP to BIGINT...");

    const hasBinanceCandleTime = columnNames.includes("binance_candle_time");

    // Add temporary columns
    const addColumns = [
      "ADD COLUMN entry_time_ms BIGINT NULL",
      "ADD COLUMN exit_time_ms BIGINT NULL",
    ];
    if (hasBinanceCandleTime) {
      addColumns.push("ADD COLUMN binance_candle_time_ms BIGINT NULL");
    }

    await query(`ALTER TABLE signal_history ${addColumns.join(", ")}`);
    console.log("Added temporary columns");

    // Convert data
    if (hasBinanceCandleTime) {
      await query(`
        UPDATE signal_history
        SET entry_time_ms = UNIX_TIMESTAMP(entry_time) * 1000,
            exit_time_ms = IF(exit_time IS NULL, NULL, UNIX_TIMESTAMP(exit_time) * 1000),
            binance_candle_time_ms = IF(binance_candle_time IS NULL, NULL, UNIX_TIMESTAMP(binance_candle_time) * 1000)
      `);
    } else {
      await query(`
        UPDATE signal_history
        SET entry_time_ms = UNIX_TIMESTAMP(entry_time) * 1000,
            exit_time_ms = IF(exit_time IS NULL, NULL, UNIX_TIMESTAMP(exit_time) * 1000)
      `);
    }
    console.log("Converted timestamps to milliseconds");

    // Drop old columns
    const dropColumns = ["DROP COLUMN entry_time", "DROP COLUMN exit_time"];
    if (hasBinanceCandleTime) {
      dropColumns.push("DROP COLUMN binance_candle_time");
    }
    await query(`ALTER TABLE signal_history ${dropColumns.join(", ")}`);
    console.log("Dropped old TIMESTAMP columns");

    // Rename and finalize
    const renameColumns = [
      "CHANGE COLUMN entry_time_ms entry_time BIGINT NOT NULL",
      "CHANGE COLUMN exit_time_ms exit_time BIGINT NULL",
    ];
    if (hasBinanceCandleTime) {
      renameColumns.push("CHANGE COLUMN binance_candle_time_ms binance_candle_time BIGINT NULL");
    } else {
      renameColumns.push("ADD COLUMN binance_candle_time BIGINT NULL");
    }

    await query(`ALTER TABLE signal_history ${renameColumns.join(", ")}`);
    console.log("Finalized new BIGINT columns");

    // Step 6: Ensure status column exists
    if (!columnNames.includes("status")) {
      console.log("Adding status column...");
      await query(`
        ALTER TABLE signal_history
        ADD COLUMN status ENUM('ACTIVE', 'MATCHED', 'NOT_FOUND') DEFAULT 'ACTIVE'
      `);
    }

    console.log("Migration completed successfully!");

    return NextResponse.json({
      success: true,
      message: "Successfully migrated signal_history table from TIMESTAMP to BIGINT",
    });
  } catch (error: any) {
    console.error("Migration error:", error);
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
