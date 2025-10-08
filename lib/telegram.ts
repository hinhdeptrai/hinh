/**
 * Telegram notification utility
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram credentials not configured. Skipping notification.");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram API error:", error);
      return false;
    }

    console.log("✓ Telegram message sent successfully");
    return true;
  } catch (error: any) {
    console.error("Failed to send Telegram message:", error.message);
    return false;
  }
}

/**
 * Format signal notification message
 */
export function formatSignalNotification(signal: {
  symbol: string;
  signal_type: "BUY" | "SELL";
  entry_price: number;
  sl_price?: number;
  tp1_price?: number;
  tp2_price?: number;
  tp3_price?: number;
  tp4_price?: number;
  tp5_price?: number;
  tp6_price?: number;
  timeframe: string;
  entry_time: string;
  is_fresh?: boolean;
  volume_confirmed?: boolean;
}): string {
  const emoji = signal.signal_type === "BUY" ? "🟢" : "🔴";
  const freshIcon = signal.is_fresh ? "🆕" : "";
  const volumeIcon = signal.volume_confirmed ? "📊" : "";

  let message = `${emoji} <b>${signal.signal_type} SIGNAL - ${signal.symbol}</b> ${freshIcon} ${volumeIcon}\n\n`;

  message += `⏰ <b>Timeframe:</b> ${signal.timeframe}\n`;
  message += `📅 <b>Entry Time:</b> ${signal.entry_time}\n`;
  message += `💰 <b>Entry Price:</b> ${signal.entry_price.toFixed(8)}\n\n`;

  if (signal.sl_price) {
    message += `🛑 <b>Stop Loss:</b> ${signal.sl_price.toFixed(8)}\n`;
  }

  message += `\n🎯 <b>Take Profits:</b>\n`;
  if (signal.tp1_price) message += `  TP1: ${signal.tp1_price.toFixed(8)}\n`;
  if (signal.tp2_price) message += `  TP2: ${signal.tp2_price.toFixed(8)}\n`;
  if (signal.tp3_price) message += `  TP3: ${signal.tp3_price.toFixed(8)}\n`;
  if (signal.tp4_price) message += `  TP4: ${signal.tp4_price.toFixed(8)}\n`;
  if (signal.tp5_price) message += `  TP5: ${signal.tp5_price.toFixed(8)}\n`;
  if (signal.tp6_price) message += `  TP6: ${signal.tp6_price.toFixed(8)}\n`;

  message += `\n✅ <i>Auto-tracked from queue</i>`;

  return message;
}

/**
 * Format queue processing summary
 */
export function formatQueueSummary(data: {
  processed: number;
  failed: number;
  results: any[];
}): string {
  let message = `📊 <b>Queue Processing Summary</b>\n\n`;

  message += `✅ <b>Processed:</b> ${data.processed}\n`;
  message += `❌ <b>Failed:</b> ${data.failed}\n`;
  message += `📝 <b>Total:</b> ${data.processed + data.failed}\n\n`;

  if (data.processed > 0) {
    message += `<b>Signals tracked:</b>\n`;
    data.results
      .filter((r) => r.status === "PROCESSED")
      .forEach((r) => {
        const emoji = r.signal_type === "BUY" ? "🟢" : "🔴";
        message += `  ${emoji} ${r.symbol} @ ${r.entry_price}\n`;
      });
  }

  if (data.failed > 0) {
    message += `\n<b>Failed signals:</b>\n`;
    data.results
      .filter((r) => r.status === "FAILED")
      .forEach((r) => {
        message += `  ❌ ${r.symbol}: ${r.error}\n`;
      });
  }

  return message;
}
