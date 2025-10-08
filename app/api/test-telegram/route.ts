import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage, formatSignalNotification } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Test Telegram notification
 * GET /api/test-telegram
 */
export async function GET(req: NextRequest) {
  try {
    // Test with a sample signal
    const sampleSignal = {
      symbol: "BTCUSDT",
      signal_type: "BUY" as const,
      entry_price: 50000.12345678,
      sl_price: 49500,
      tp1_price: 50500,
      tp2_price: 51000,
      tp3_price: 51500,
      tp4_price: 52000,
      tp5_price: 53000,
      tp6_price: 55000,
      timeframe: "15m",
      entry_time: new Date().toISOString(),
      is_fresh: true,
      volume_confirmed: true,
    };

    const message = formatSignalNotification(sampleSignal);

    console.log("Testing Telegram notification...");
    console.log("Message:", message);

    const success = await sendTelegramMessage(message);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "✅ Telegram notification sent successfully!",
        telegram_configured: true,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "❌ Failed to send Telegram notification. Check logs.",
          telegram_configured: !!process.env.TELEGRAM_BOT_TOKEN,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Test Telegram error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        telegram_configured: !!process.env.TELEGRAM_BOT_TOKEN,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/test-telegram - Test with custom message
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const success = await sendTelegramMessage(message);

    return NextResponse.json({
      success,
      message: success
        ? "✅ Message sent successfully"
        : "❌ Failed to send message",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
