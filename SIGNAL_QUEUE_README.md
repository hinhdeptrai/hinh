# 🎯 Signal Auto-Tracking Queue System

## ✨ Tính năng

Hệ thống tự động track signal khi nến đóng, giải quyết vấn đề:
- ❌ **Trước**: Signal ở nến chưa đóng → không thể track chính xác
- ✅ **Sau**: Click "Queue" → Tự động track khi nến đóng với thời gian chính xác 100%

## 🚀 Cách sử dụng nhanh

### 1. Thêm signal vào queue

Khi thấy signal mới ở nến hiện tại:

![Queue Button](https://via.placeholder.com/150x50/4CAF50/FFFFFF?text=Queue)

- Nút **⏱️ Queue** sẽ hiện khi `barsSinceSignal = 0` (nến chưa đóng)
- Click → Thêm vào hàng đợi
- Popup hiển thị: Thời gian nến đóng + thời gian chờ

### 2. Setup Cron Job

**Cách đơn giản nhất (Node.js):**

```bash
# Install node-cron
npm install node-cron

# Tạo file scripts/cron.js
```

```javascript
const cron = require('node-cron');

cron.schedule('* * * * *', async () => {
  console.log('Processing signal queue...');
  const res = await fetch('http://localhost:3000/api/process-signal-queue', {
    method: 'POST',
  });
  const data = await res.json();
  console.log('Processed:', data.processed, 'Failed:', data.failed);
});

console.log('Cron started!');
```

```bash
# Chạy
node scripts/cron.js
```

### 3. Xem kết quả

Signals sẽ tự động được track và lưu vào `signal_history` khi nến đóng.

## 📊 Database Schema

### Bảng `signal_queue`

```sql
CREATE TABLE signal_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  signal_type ENUM('BUY', 'SELL') NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  sl_price DECIMAL(20, 8),
  tp1_price ... tp6_price DECIMAL(20, 8),
  signal_time BIGINT NOT NULL,           -- Thời gian signal xuất hiện (ms)
  candle_close_time BIGINT NOT NULL,     -- Thời gian nến đóng (ms)
  is_fresh BOOLEAN DEFAULT FALSE,
  volume_confirmed BOOLEAN DEFAULT FALSE,
  status ENUM('PENDING', 'PROCESSED', 'FAILED') DEFAULT 'PENDING',
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Flow hoạt động

```
1. User click "⏱️ Queue"
   ↓
2. POST /api/queue-signal
   ↓
3. Calculate candle_close_time = signal_time + interval
   ↓
4. Save to signal_queue with status = 'PENDING'
   ↓
5. Cron job chạy mỗi phút
   ↓
6. POST /api/process-signal-queue
   ↓
7. Get all PENDING signals WHERE candle_close_time <= NOW()
   ↓
8. For each signal:
   - Fetch latest klines from Binance
   - Get candle với openTime = signal_time
   - Use candle close price làm entry_price
   - Save to signal_history
   - Update status = 'PROCESSED'
```

## 📝 API Documentation

### `POST /api/queue-signal`

Thêm signal vào queue.

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "15m",
  "signal_type": "BUY",
  "entry_price": 50000,
  "sl_price": 49500,
  "tp1_price": 50500,
  "tp2_price": 51000,
  "tp3_price": 51500,
  "signal_time": "2024-01-01T12:00:00.000Z",
  "is_fresh": true,
  "volume_confirmed": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Signal added to queue",
  "data": {
    "candle_close_time_iso": "2024-01-01T12:15:00.000Z",
    "wait_time_minutes": "14.5"
  }
}
```

### `POST /api/process-signal-queue`

Process tất cả pending signals (gọi bởi cron).

**Response:**
```json
{
  "success": true,
  "message": "Processed 3 signals",
  "processed": 3,
  "failed": 0,
  "results": [
    {
      "id": 1,
      "symbol": "BTCUSDT",
      "status": "PROCESSED",
      "entry_time": "2024-01-01T12:00:00.000Z",
      "entry_price": 50123.45
    }
  ],
  "stats": {
    "total": 10,
    "pending": 5,
    "processed": 4,
    "failed": 1
  }
}
```

### `GET /api/process-signal-queue`

Kiểm tra queue status (không process).

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 10,
    "pending": 5,
    "processed": 4,
    "failed": 1
  },
  "ready_to_process": 2,
  "pending_signals": [
    {
      "id": 7,
      "symbol": "ETHUSDT",
      "timeframe": "1h",
      "signal_type": "SELL",
      "candle_close_time": "2024-01-01T13:00:00.000Z",
      "wait_time_minutes": "5.3"
    }
  ]
}
```

## ⚙️ Setup Options

### Development (Local)

```bash
# Option 1: Node.js script
node scripts/cron.js

# Option 2: Manual testing
curl -X POST http://localhost:3000/api/process-signal-queue
```

### Production

#### 1. **Vercel Cron** (Recommended)

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/process-signal-queue",
      "schedule": "* * * * *"
    }
  ]
}
```

#### 2. **External Cron Service**

Sử dụng [cron-job.org](https://cron-job.org):
- URL: `https://yourdomain.com/api/process-signal-queue`
- Method: POST
- Schedule: Every 1 minute

#### 3. **Linux Cron**

```bash
crontab -e
# Add:
* * * * * curl -X POST https://yourdomain.com/api/process-signal-queue
```

## 🎨 UI Changes

### Trước:
```
[Chi tiết] [Theo dõi] [Xóa]
```

### Sau:
```
- Nếu barsSinceSignal = 0 (nến chưa đóng):
  [Chi tiết] [⏱️ Queue] [Xóa]

- Nếu barsSinceSignal > 0 (nến đã đóng):
  [Chi tiết] [Theo dõi] [Xóa]
```

## 🐛 Troubleshooting

### Issue 1: Queue không process

**Check:**
```bash
# Kiểm tra xem có signals pending không
curl http://localhost:3000/api/process-signal-queue | jq

# Kiểm tra database
mysql> SELECT * FROM signal_queue WHERE status='PENDING';
```

**Fix:**
- Đảm bảo cron đang chạy
- Check logs: `console.log` trong `/api/process-signal-queue`

### Issue 2: Failed signals

**Check logs:**
```bash
curl -X POST http://localhost:3000/api/process-signal-queue | jq '.results'
```

**Common causes:**
- Binance API rate limit
- Network timeout
- Invalid symbol/timeframe

### Issue 3: Wrong entry time

**Check:**
```sql
SELECT
  id,
  symbol,
  FROM_UNIXTIME(signal_time/1000) as signal_time,
  FROM_UNIXTIME(candle_close_time/1000) as candle_close,
  status
FROM signal_queue;
```

Entry time phải = signal candle openTime (exact match).

## 📈 Monitoring

### Queue Stats

```bash
# Quick stats
curl http://localhost:3000/api/process-signal-queue | jq '.stats'

# Output:
{
  "total": 50,
  "pending": 10,
  "processed": 38,
  "failed": 2
}
```

### Database Queries

```sql
-- Pending signals
SELECT COUNT(*) FROM signal_queue WHERE status='PENDING';

-- Success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM signal_queue), 2) as percentage
FROM signal_queue
GROUP BY status;

-- Recent processed
SELECT
  symbol,
  timeframe,
  signal_type,
  FROM_UNIXTIME(candle_close_time/1000) as closed_at,
  processed_at
FROM signal_queue
WHERE status='PROCESSED'
ORDER BY processed_at DESC
LIMIT 10;
```

## 🧹 Maintenance

### Cleanup old signals

```sql
-- Xóa signals processed/failed sau 30 ngày
DELETE FROM signal_queue
WHERE status IN ('PROCESSED', 'FAILED')
AND processed_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

Setup auto cleanup (chạy 1 lần/ngày):
```bash
# Cron: 0 2 * * * (2 AM daily)
mysql -u root -p trade_admin -e "DELETE FROM signal_queue WHERE status IN ('PROCESSED', 'FAILED') AND processed_at < DATE_SUB(NOW(), INTERVAL 30 DAY);"
```

## 🎯 Performance Tips

1. **Index optimization:**
   ```sql
   CREATE INDEX idx_status_closetime ON signal_queue(status, candle_close_time);
   ```

2. **Batch processing:**
   - Current: Process max 100 signals per run
   - Adjust in `getPendingQueueSignals()` if needed

3. **Rate limiting:**
   - Binance API: 1200 requests/minute
   - Current: ~60 requests/minute (safe)

## 📚 Related Files

- `lib/db.ts` - Database functions
- `app/api/queue-signal/route.ts` - Queue API
- `app/api/process-signal-queue/route.ts` - Processor API
- `app/page.tsx` - UI với Queue button
- `CRON_SETUP.md` - Detailed cron setup guide

## ✅ Testing Checklist

- [ ] Click "⏱️ Queue" button
- [ ] Verify signal added to DB: `SELECT * FROM signal_queue WHERE status='PENDING'`
- [ ] Wait for candle close time
- [ ] Run: `curl -X POST http://localhost:3000/api/process-signal-queue`
- [ ] Check result: Signal moved to `signal_history`
- [ ] Verify entry_time matches Binance candle openTime

## 🤝 Contributing

Nếu có bug hoặc suggestion, vui lòng:
1. Check existing issues
2. Create new issue với detailed description
3. Submit PR if có fix

---

**Happy Trading! 🚀📈**
