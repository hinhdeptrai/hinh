import { NextRequest, NextResponse } from "next/server";
import { storeAuthCode, cleanupExpiredCodes } from "@/lib/db";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(req: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
      return NextResponse.json(
        { error: "Telegram configuration missing" },
        { status: 500 }
      );
    }

    // Clean up expired codes first
    await cleanupExpiredCodes();

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store code in database
    await storeAuthCode(code, expiresAt);

    // Send code via Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const message = `🔐 *Mã đăng nhập Trade Admin*\n\nMã: \`${code}\`\n\nMã này sẽ hết hạn sau 15 phút.\n\n⏰ ${new Date().toLocaleString('vi-VN')}`;

    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!telegramResponse.ok) {
      console.error("Telegram API error:", await telegramResponse.text());
      return NextResponse.json(
        { error: "Failed to send code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Code sent to Telegram",
      expiresIn: 15 * 60 // seconds
    });
  } catch (error: any) {
    console.error("Send code error:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}