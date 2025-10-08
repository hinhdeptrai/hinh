# 🎯 Signal Queue + Telegram Notification - Complete Guide

## 📋 Tổng quan

Hệ thống tự động track signal khi nến đóng và gửi thông báo Telegram:

```
User click "Queue" → Signal vào queue → Cron chạy → Nến đóng → Track signal → 📱 Telegram notification
```

## 🚀 Quick Start (5 phút)

### 1. Setup Telegram Bot

```bash
# Mở Telegram
# Tìm: @BotFather
# Gửi: /newbot
# → Nhận BOT_TOKEN

# Tìm: @userinfobot
# → Nhận CHAT_ID
```

### 2. Cấu hình .env

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### 3. Test

```bash
# Test Telegram
curl http://localhost:3000/api/test-telegram

# Should receive message in Telegram! 📱
```

### 4. Setup Cron

```javascript
// scripts/cron.js
const cron = require('node-cron');

cron.schedule('* * * * *', async () => {
  const res = await fetch('http://localhost:3000/api/process-signal-queue', {
    method: 'POST'
  });
  console.log(await res.json());
});

console.log('Cron started!');
```

```bash
npm install node-cron
node scripts/cron.js
```

## 📱 Thông báo Telegram

### Khi track signal từ queue:

Bạn sẽ nhận được message như này:

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

### Summary message:

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

## 🔄 Complete Flow

```
1. Thấy signal mới (nến chưa đóng)
   ↓
2. Click "⏱️ Queue"
   ↓
3. Signal vào database với status = PENDING
   ↓
4. Cron chạy mỗi phút
   ↓
5. Check: candle_close_time <= NOW()?
   ↓ YES
6. Fetch candle từ Binance
   ↓
7. Store vào signal_history
   ↓
8. 📱 Gửi Telegram notification
   ↓
9. Update status = PROCESSED
   ↓
10. 📱 Gửi summary notification
```

## 🛠️ APIs

### Test Telegram

```bash
# GET - Test với sample signal
curl http://localhost:3000/api/test-telegram

# POST - Test với custom message
curl -X POST http://localhost:3000/api/test-telegram \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! 🚀"}'
```

### Queue Signal

```bash
curl -X POST http://localhost:3000/api/queue-signal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "15m",
    "signal_type": "BUY",
    "entry_price": 50000,
    "sl_price": 49500,
    "tp1_price": 50500,
    "signal_time": "2024-01-01T12:00:00.000Z"
  }'
```

### Process Queue (Cron)

```bash
# Process all pending signals
curl -X POST http://localhost:3000/api/process-signal-queue

# Check queue status
curl http://localhost:3000/api/process-signal-queue
```

## 📂 File Structure

```
trade/
├── lib/
│   ├── db.ts                    # Database functions + queue
│   └── telegram.ts              # ⭐ NEW: Telegram utilities
├── app/api/
│   ├── queue-signal/
│   │   └── route.ts            # Add signal to queue
│   ├── process-signal-queue/
│   │   └── route.ts            # ⭐ UPDATED: Process + Telegram
│   └── test-telegram/
│       └── route.ts            # ⭐ NEW: Test notifications
├── .env                         # ⭐ Add Telegram credentials
├── TELEGRAM_SETUP.md            # ⭐ NEW: Setup guide
├── SIGNAL_QUEUE_README.md       # Queue documentation
└── CRON_SETUP.md                # Cron setup guide
```

## 🎨 UI

### Nút hiển thị:

- **Nến chưa đóng** (`barsSinceSignal = 0`):
  ```
  [⏱️ Queue]  → Thêm vào queue
  ```

- **Nến đã đóng** (`barsSinceSignal > 0`):
  ```
  [Theo dõi]  → Track ngay
  ```

## 🧪 Testing Workflow

### Full test từ đầu đến cuối:

```bash
# 1. Test Telegram connection
curl http://localhost:3000/api/test-telegram
# → Check Telegram app, bạn sẽ nhận được message

# 2. Queue một signal (giả lập signal ở nến chưa đóng)
curl -X POST http://localhost:3000/api/queue-signal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "1m",
    "signal_type": "BUY",
    "entry_price": 50000,
    "sl_price": 49500,
    "tp1_price": 50500,
    "signal_time": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }'

# 3. Wait 1 minute (để nến đóng)

# 4. Process queue
curl -X POST http://localhost:3000/api/process-signal-queue

# 5. Check Telegram
# Bạn sẽ nhận 2 messages:
#   - Signal detail (BUY BTCUSDT...)
#   - Summary (Processed: 1, Failed: 0)
```

## 🔧 Configuration

### Telegram settings (lib/telegram.ts):

```typescript
// Bật/tắt notifications
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM !== 'false';

// Chỉ gửi summary (không gửi từng signal)
const SEND_INDIVIDUAL_SIGNALS = false;

// Chỉ gửi khi có ít nhất X signals
const MIN_SIGNALS_FOR_NOTIFICATION = 1;
```

### Message format:

Edit `lib/telegram.ts`:

```typescript
export function formatSignalNotification(signal: {...}): string {
  // Customize format tại đây
  let message = `...`;
  return message;
}
```

## 📊 Monitoring

### Check logs:

```bash
# Xem Telegram logs
grep "Telegram" logs/*.log

# Xem signals processed
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status='PROCESSED' THEN 1 ELSE 0 END) as processed
FROM signal_queue
WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

### Dashboard queries:

```sql
-- Signals processed hôm nay
SELECT
  symbol,
  COUNT(*) as count,
  AVG(TIMESTAMPDIFF(SECOND,
    FROM_UNIXTIME(candle_close_time/1000),
    processed_at
  )) as avg_delay_seconds
FROM signal_queue
WHERE DATE(processed_at) = CURDATE()
AND status = 'PROCESSED'
GROUP BY symbol;

-- Success rate
SELECT
  DATE(processed_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN status='PROCESSED' THEN 1 ELSE 0 END) as success,
  ROUND(100.0 * SUM(CASE WHEN status='PROCESSED' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM signal_queue
GROUP BY DATE(processed_at)
ORDER BY date DESC
LIMIT 7;
```

## 🐛 Troubleshooting

### Issue 1: Không nhận được Telegram notification

**Check:**
```bash
# 1. Verify credentials
curl http://localhost:3000/api/test-telegram

# 2. Check logs
grep "Telegram" logs/*.log

# 3. Test Telegram API directly
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

**Common fixes:**
- Đảm bảo đã start bot trong Telegram (nhấn Start)
- Check token và chat_id trong `.env`
- Restart server sau khi thay đổi `.env`

### Issue 2: Telegram gửi nhưng signal không được track

**Check:**
```bash
# Xem signals đã process
SELECT * FROM signal_queue WHERE status='PROCESSED' ORDER BY processed_at DESC LIMIT 5;

# Xem signals trong history
SELECT * FROM signal_history ORDER BY entry_time DESC LIMIT 5;
```

**Fix:**
- Check Binance API có hoạt động không
- Verify entry_time đúng format (milliseconds)

### Issue 3: Nhận quá nhiều notifications

**Fix 1: Batch notifications**
```typescript
// Chỉ gửi summary, không gửi từng signal
// Trong process-signal-queue/route.ts
// Comment out phần sendTelegramMessage trong loop
```

**Fix 2: Throttle notifications**
```typescript
// Chỉ gửi nếu processed > X signals
if (successCount >= 5) {
  await sendTelegramMessage(summaryMessage);
}
```

## 🎯 Best Practices

### 1. Rate limiting
- Telegram API: Max 30 messages/second
- Current: ~1 message/signal + 1 summary
- Safe cho < 100 signals/batch

### 2. Error handling
- Telegram errors không làm failed signal processing
- Retry mechanism for critical notifications

### 3. Message format
- Keep under 4096 characters (Telegram limit)
- Use HTML formatting
- Include emoji cho dễ đọc

### 4. Monitoring
- Log all Telegram sends
- Track delivery rate
- Alert if nhiều failures

## 📚 Documentation Links

- **Setup**: `TELEGRAM_SETUP.md`
- **Queue System**: `SIGNAL_QUEUE_README.md`
- **Cron Setup**: `CRON_SETUP.md`

## ✅ Final Checklist

- [ ] Tạo Telegram bot (@BotFather)
- [ ] Lấy Bot Token và Chat ID
- [ ] Update `.env` với credentials
- [ ] Test: `curl http://localhost:3000/api/test-telegram`
- [ ] Verify nhận được message trong Telegram
- [ ] Setup cron job (`node scripts/cron.js`)
- [ ] Queue một signal test
- [ ] Wait và verify nhận notification
- [ ] Monitor logs và database

---

**Hệ thống hoàn chỉnh! Signal sẽ tự động track và báo về Telegram khi nến đóng! 🎉📱**
