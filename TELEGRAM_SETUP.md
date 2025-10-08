# 📱 Telegram Notification Setup Guide

## Tổng quan

Hệ thống sẽ tự động gửi thông báo qua Telegram khi:
- ✅ Signal được process từ queue (khi nến đóng)
- 📊 Summary sau mỗi lần chạy cron

## 🚀 Setup Telegram Bot

### Bước 1: Tạo Bot

1. Mở Telegram, tìm **@BotFather**
2. Gửi lệnh: `/newbot`
3. Đặt tên bot (ví dụ: "Trading Signal Bot")
4. Đặt username (ví dụ: "my_trading_signal_bot")
5. BotFather sẽ trả về **BOT TOKEN** như sau:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
6. **Lưu lại token này!**

### Bước 2: Lấy Chat ID

**Option 1: Dùng @userinfobot**
1. Tìm **@userinfobot** trên Telegram
2. Start bot
3. Bot sẽ trả về thông tin của bạn, trong đó có **Id** (đây là Chat ID)

**Option 2: Dùng @getidsbot**
1. Tìm **@getidsbot** trên Telegram
2. Start bot
3. Bot sẽ hiển thị **Your user ID**

**Option 3: Manual (dùng API)**
1. Gửi tin nhắn bất kỳ cho bot của bạn
2. Mở URL: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Tìm `"chat":{"id":123456789}` trong response

### Bước 3: Cấu hình .env

Thêm vào file `.env`:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### Bước 4: Test Notification

```bash
# Test basic notification
curl http://localhost:3000/api/test-telegram

# Test custom message
curl -X POST http://localhost:3000/api/test-telegram \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from Trading Bot! 🚀"}'
```

Nếu thành công, bạn sẽ nhận được message trong Telegram!

## 📊 Format thông báo

### Khi signal được track từ queue:

```
🟢 BUY SIGNAL - BTCUSDT 🆕 📊

⏰ Timeframe: 15m
📅 Entry Time: 2024-01-01T12:00:00.000Z
💰 Entry Price: 50000.12345678

🛑 Stop Loss: 49500.00000000

🎯 Take Profits:
  TP1: 50500.00000000
  TP2: 51000.00000000
  TP3: 51500.00000000
  TP4: 52000.00000000
  TP5: 53000.00000000
  TP6: 55000.00000000

✅ Auto-tracked from queue
```

### Summary sau khi process:

```
📊 Queue Processing Summary

✅ Processed: 3
❌ Failed: 0
📝 Total: 3

Signals tracked:
  🟢 BTCUSDT @ 50000.12
  🔴 ETHUSDT @ 3000.45
  🟢 BNBUSDT @ 450.67
```

## 🎨 Customization

### Thay đổi format message

Edit file `lib/telegram.ts`:

```typescript
export function formatSignalNotification(signal: {...}): string {
  // Customize message format here
  let message = `...`;
  return message;
}
```

### Gửi đến nhiều chat

```typescript
// Trong .env, dùng dấu phẩy để tách nhiều chat IDs
TELEGRAM_CHAT_ID=123456789,987654321

// Trong code:
const chatIds = process.env.TELEGRAM_CHAT_ID?.split(',') || [];
for (const chatId of chatIds) {
  await sendToChat(chatId, message);
}
```

### Gửi ảnh/chart

```typescript
export async function sendTelegramPhoto(
  photoUrl: string,
  caption: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      photo: photoUrl,
      caption: caption,
      parse_mode: "HTML",
    }),
  });

  return response.ok;
}
```

## 🔧 Troubleshooting

### Issue 1: "Telegram credentials not configured"

**Check:**
```bash
# Xem env variables
echo $TELEGRAM_BOT_TOKEN
echo $TELEGRAM_CHAT_ID

# Hoặc trong code
console.log(process.env.TELEGRAM_BOT_TOKEN);
console.log(process.env.TELEGRAM_CHAT_ID);
```

**Fix:**
- Đảm bảo `.env` có đúng credentials
- Restart server sau khi thay đổi `.env`

### Issue 2: Bot không gửi được message

**Common causes:**
1. **Bot token sai**: Kiểm tra lại token từ BotFather
2. **Chat ID sai**: Kiểm tra lại ID
3. **Chưa start bot**: Phải nhấn **Start** trong chat với bot trước
4. **Bot bị blocked**: Unblock bot trong Telegram

**Test:**
```bash
# Test trực tiếp qua Telegram API
curl https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message"
```

### Issue 3: HTML format lỗi

Nếu message không hiển thị đúng format:

**Fix:**
```typescript
// Escape HTML characters
const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

// Use in message
message += `<b>${escapeHtml(signal.symbol)}</b>`;
```

## 📱 Advanced: Group notifications

### Send to Telegram group

1. Tạo group trong Telegram
2. Thêm bot vào group
3. Promote bot thành admin (để có quyền gửi tin)
4. Lấy group chat ID:
   - Gửi tin nhắn trong group
   - Truy cập: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Chat ID của group thường bắt đầu bằng `-` (âm): `-123456789`

```bash
# .env
TELEGRAM_CHAT_ID=-123456789
```

## 🔐 Security

### Best practices:

1. **Không commit .env** vào git:
   ```bash
   # Đảm bảo .env trong .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use environment variables** trong production:
   - Vercel: Project Settings → Environment Variables
   - Heroku: Config Vars
   - Docker: `-e TELEGRAM_BOT_TOKEN=...`

3. **Rotate token** định kỳ:
   - Trong BotFather: `/token` → chọn bot → Revoke & create new

## 📊 Monitoring

### Check notification logs

```bash
# Xem logs của API
tail -f logs/signal-queue.log | grep "Telegram"

# Hoặc check trong database
SELECT COUNT(*) as notifications_sent
FROM signal_queue
WHERE status = 'PROCESSED'
AND processed_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
```

### Setup alerts for failures

```typescript
// Trong process-signal-queue/route.ts
if (telegramError) {
  // Log to monitoring service
  console.error('ALERT: Telegram notification failed', {
    signal_id: signal.id,
    error: telegramError.message,
  });
}
```

## 🎯 Testing

### Test scenarios:

1. **Test basic notification:**
   ```bash
   curl http://localhost:3000/api/test-telegram
   ```

2. **Test signal notification:**
   ```bash
   # Queue a signal, wait for candle close, then process
   curl -X POST http://localhost:3000/api/process-signal-queue
   ```

3. **Test custom message:**
   ```bash
   curl -X POST http://localhost:3000/api/test-telegram \
     -H "Content-Type: application/json" \
     -d '{"message": "Test 🚀"}'
   ```

## 📚 Resources

- [Telegram Bot API Docs](https://core.telegram.org/bots/api)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)
- [HTML formatting in Telegram](https://core.telegram.org/bots/api#html-style)

## ✅ Checklist

- [ ] Tạo bot với @BotFather
- [ ] Lấy Bot Token
- [ ] Lấy Chat ID
- [ ] Thêm vào `.env`
- [ ] Restart server
- [ ] Test notification: `curl http://localhost:3000/api/test-telegram`
- [ ] Verify message received trong Telegram
- [ ] Test với real signal queue

---

**Hãy đảm bảo bạn đã start bot trong Telegram trước khi test!** 🚀
