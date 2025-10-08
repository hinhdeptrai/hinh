# Signal Queue Auto-Tracking - Cron Setup Guide

## Tổng quan

Hệ thống tự động track signal khi nến đóng bằng cách:
1. Khi signal đang ở nến hiện tại (chưa đóng), click nút **⏱️ Queue** để thêm vào hàng đợi
2. Cron job chạy mỗi phút, kiểm tra signals nào đã đến thời gian nến đóng
3. Tự động fetch data từ Binance và lưu vào signal history

## Cách sử dụng

### 1. Queue một signal

Khi thấy signal ở nến hiện tại (`barsSinceSignal = 0`):
- Click nút **⏱️ Queue**
- Hệ thống sẽ tính toán thời điểm nến đóng và thêm vào queue
- Nhận thông báo: "✅ Đã thêm vào queue! Nến sẽ đóng lúc: ..."

### 2. Kiểm tra queue status

```bash
# Xem signals đang pending
curl http://localhost:3000/api/process-signal-queue
```

Response:
```json
{
  "success": true,
  "stats": {
    "total": 5,
    "pending": 3,
    "processed": 2,
    "failed": 0
  },
  "ready_to_process": 1,
  "pending_signals": [...]
}
```

### 3. Process queue thủ công (test)

```bash
curl -X POST http://localhost:3000/api/process-signal-queue
```

## Setup Cron Job

### Option 1: Cron (Linux/Mac)

```bash
# Mở crontab editor
crontab -e

# Thêm dòng này (chạy mỗi phút)
* * * * * curl -X POST http://localhost:3000/api/process-signal-queue >> /var/log/signal-queue.log 2>&1
```

### Option 2: Windows Task Scheduler

1. Mở **Task Scheduler**
2. Create Basic Task:
   - Name: "Signal Queue Processor"
   - Trigger: Daily, repeat every 1 minute
   - Action: Start a program
   - Program: `curl`
   - Arguments: `-X POST http://localhost:3000/api/process-signal-queue`

### Option 3: Node.js Cron (Recommended cho development)

Tạo file `scripts/cron.js`:

```javascript
const cron = require('node-cron');

// Chạy mỗi phút
cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Processing signal queue...`);

  try {
    const response = await fetch('http://localhost:3000/api/process-signal-queue', {
      method: 'POST',
    });

    const result = await response.json();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
});

console.log('Signal queue cron job started');
```

Chạy:
```bash
npm install node-cron
node scripts/cron.js
```

### Option 4: Vercel Cron (Production)

Tạo file `vercel.json`:

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

### Option 5: External Cron Service

Sử dụng dịch vụ như:
- **cron-job.org** (free, reliable)
- **EasyCron**
- **Cronitor**

Setup:
1. Đăng ký tài khoản
2. Tạo cron job mới
3. URL: `https://yourdomain.com/api/process-signal-queue`
4. Method: POST
5. Interval: Every 1 minute

## API Endpoints

### POST `/api/queue-signal`
Thêm signal vào queue

Request:
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "15m",
  "signal_type": "BUY",
  "entry_price": 50000,
  "sl_price": 49500,
  "tp1_price": 50500,
  "signal_time": "2024-01-01T00:00:00.000Z",
  "is_fresh": true,
  "volume_confirmed": true
}
```

### POST `/api/process-signal-queue`
Process pending signals (gọi bởi cron)

Response:
```json
{
  "success": true,
  "message": "Processed 3 signals",
  "processed": 3,
  "failed": 0,
  "results": [...],
  "stats": {...}
}
```

### GET `/api/process-signal-queue`
Kiểm tra queue status

## Monitoring

### Check logs

```bash
# Xem signals đã được process
curl http://localhost:3000/api/signal-history?symbol=BTCUSDT

# Xem queue stats
curl http://localhost:3000/api/process-signal-queue | jq '.stats'
```

### Database queries

```sql
-- Xem signals trong queue
SELECT * FROM signal_queue WHERE status = 'PENDING';

-- Xem signals đã process
SELECT * FROM signal_queue WHERE status = 'PROCESSED' ORDER BY processed_at DESC LIMIT 10;

-- Stats
SELECT status, COUNT(*) as count FROM signal_queue GROUP BY status;
```

## Troubleshooting

### Issue: Signals không được process

**Check:**
1. Cron job có đang chạy không?
2. URL có đúng không? (http://localhost:3000 cho local)
3. Database có bị lỗi không?

**Solution:**
```bash
# Test API thủ công
curl -X POST http://localhost:3000/api/process-signal-queue

# Kiểm tra logs
tail -f /var/log/signal-queue.log
```

### Issue: Failed signals

**Check:**
```bash
# Xem failed signals
curl http://localhost:3000/api/process-signal-queue | jq '.pending_signals[] | select(.status == "FAILED")'
```

**Common causes:**
- Binance API lỗi (network issues)
- Symbol không tồn tại
- Timeframe không hợp lệ

## Best Practices

1. **Monitoring**: Setup alerts khi có quá nhiều failed signals
2. **Cleanup**: Định kỳ xóa old processed signals (sau 30 ngày)
3. **Backup**: Backup database thường xuyên
4. **Rate Limiting**: Đảm bảo không vượt quá rate limit của Binance API

## Cleanup Script

Tạo file `scripts/cleanup-queue.sql`:

```sql
-- Xóa signals đã process sau 30 ngày
DELETE FROM signal_queue
WHERE status IN ('PROCESSED', 'FAILED')
AND processed_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

Chạy định kỳ (1 lần/ngày):
```bash
mysql -u root -p trade_admin < scripts/cleanup-queue.sql
```
