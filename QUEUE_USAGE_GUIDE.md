# 🎯 Signal Queue System - Hướng dẫn sử dụng

## Tổng quan

Hệ thống Queue cho phép theo dõi signals từ nến chưa đóng một cách chính xác. Khi nến đóng, hệ thống tự động lấy giá đóng thực tế từ Binance và lưu vào tracking.

### Vấn đề giải quyết

- ❌ **Trước**: Signal ở nến chưa đóng → Thời gian entry không chính xác
- ✅ **Sau**: Click "Queue" → Tự động track khi nến đóng với giá chính xác 100%

## 🚀 Cách sử dụng

### 1. Thêm signal vào Queue

Khi bạn thấy signal mới (Fresh signal với `barsSinceSignal = 0`):

1. Nhấn nút **⏱️ Queue** (màu vàng)
2. System sẽ:
   - Tính toán thời gian nến đóng
   - Lưu signal vào hàng đợi
   - Hiển thị popup với thời gian chờ

**Ví dụ:**
```
✅ Signal đã được thêm vào hàng đợi!

Nến sẽ đóng lúc: 14:15:00
Thời gian chờ: 12.5 phút
```

### 2. Setup Cron Job

Bạn cần chạy cron job để xử lý signals trong queue.

#### Option 1: Node.js với node-cron (Khuyên dùng cho Development)

```bash
# Cài đặt node-cron (nếu chưa có)
npm install node-cron

# Chạy cron service
node scripts/queue-cron-service.js
```

Hoặc dùng PM2 để chạy background:
```bash
npm install -g pm2
pm2 start scripts/queue-cron-service.js --name signal-queue
pm2 save
pm2 startup
```

#### Option 2: Cron đơn giản (Chạy thủ công hoặc với system cron)

```bash
# Chạy một lần
node scripts/process-queue-cron.js

# Hoặc thêm vào crontab (chạy mỗi phút)
crontab -e
# Thêm dòng:
* * * * * cd /path/to/future-indicator && node scripts/process-queue-cron.js >> /var/log/signal-queue.log 2>&1
```

#### Option 3: Vercel Cron (Production)

Tạo file `vercel.json` ở root:
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

#### Option 4: External Cron Service

Dùng [cron-job.org](https://cron-job.org) hoặc tương tự:
- URL: `https://yourdomain.com/api/process-signal-queue`
- Method: POST
- Schedule: Every 1 minute

### 3. Kiểm tra Queue Status

```bash
# Kiểm tra status (không xử lý)
curl http://localhost:3000/api/process-signal-queue | jq

# Xử lý queue thủ công
curl -X POST http://localhost:3000/api/process-signal-queue | jq
```

**Response mẫu:**
```json
{
  "success": true,
  "message": "Processed 3 signals",
  "processed": 3,
  "failed": 0,
  "stats": {
    "total": 15,
    "pending": 5,
    "processed": 9,
    "failed": 1
  },
  "results": [
    {
      "id": 1,
      "symbol": "BTCUSDT",
      "status": "PROCESSED",
      "entry_time": "2024-01-15T14:15:00.000Z",
      "entry_price": 42156.8
    }
  ]
}
```

## 🗄️ Database Schema

### Bảng `signal_queue`

```sql
CREATE TABLE signal_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  signal_type ENUM('BUY', 'SELL') NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  sl_price DECIMAL(20, 8),
  tp1_price DECIMAL(20, 8),
  tp2_price DECIMAL(20, 8),
  tp3_price DECIMAL(20, 8),
  tp4_price DECIMAL(20, 8),
  tp5_price DECIMAL(20, 8),
  tp6_price DECIMAL(20, 8),
  signal_time BIGINT NOT NULL,           -- Thời gian signal xuất hiện (ms)
  candle_close_time BIGINT NOT NULL,     -- Thời gian nến đóng (ms)
  is_fresh BOOLEAN DEFAULT FALSE,
  volume_confirmed BOOLEAN DEFAULT FALSE,
  status ENUM('PENDING', 'PROCESSED', 'FAILED') DEFAULT 'PENDING',
  processed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_closetime (status, candle_close_time)
);
```

Bảng sẽ tự động tạo khi chạy lần đầu.

## 🔄 Flow hoạt động

```
1. User thấy Fresh Signal (barsSinceSignal = 0)
   ↓
2. Click "⏱️ Queue"
   ↓
3. API /api/queue-signal:
   - Calculate candle_close_time = signal_time + interval
   - Save to signal_queue với status = 'PENDING'
   ↓
4. Cron job chạy mỗi phút
   ↓
5. API /api/process-signal-queue:
   - Get signals WHERE status='PENDING' AND candle_close_time <= NOW()
   - For each signal:
     * Fetch klines từ Binance
     * Tìm candle khớp với signal_time
     * Lấy close price làm entry_price
     * Save vào signal_history
     * Update status = 'PROCESSED'
   ↓
6. Signal tracking tự động với giá chính xác
```

## 📝 API Reference

### POST /api/queue-signal

Thêm signal vào queue.

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "15m",
  "signal_type": "BUY",
  "entry_price": 42150.5,
  "sl_price": 41800,
  "tp1_price": 42500,
  "tp2_price": 42850,
  "tp3_price": 43200,
  "signal_time": "2024-01-15T14:00:00.000Z",
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
    "candle_close_time_iso": "2024-01-15T14:15:00.000Z",
    "wait_time_minutes": "14.2"
  }
}
```

### POST /api/process-signal-queue

Xử lý tất cả pending signals (dùng cho cron).

**Response:**
```json
{
  "success": true,
  "message": "Processed 2 signals",
  "processed": 2,
  "failed": 0,
  "results": [...],
  "stats": {
    "total": 10,
    "pending": 3,
    "processed": 6,
    "failed": 1
  }
}
```

### GET /api/process-signal-queue

Kiểm tra queue status (không xử lý).

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
      "candle_close_time": "2024-01-15T15:00:00.000Z",
      "wait_time_minutes": "8.5"
    }
  ]
}
```

## 🧪 Testing

### 1. Test thêm vào queue

```bash
curl -X POST http://localhost:3000/api/queue-signal \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "15m",
    "signal_type": "BUY",
    "entry_price": 42000,
    "sl_price": 41500,
    "tp1_price": 42500,
    "signal_time": "2024-01-15T14:00:00.000Z"
  }'
```

### 2. Kiểm tra database

```bash
mysql -u root -p trade_admin -e "SELECT * FROM signal_queue WHERE status='PENDING'"
```

### 3. Test xử lý queue

```bash
curl -X POST http://localhost:3000/api/process-signal-queue | jq
```

### 4. Kiểm tra signal đã track

```bash
mysql -u root -p trade_admin -e "SELECT * FROM signal_history ORDER BY created_at DESC LIMIT 5"
```

## 🐛 Troubleshooting

### Queue không được xử lý

**Kiểm tra:**
```bash
# 1. Xem có signals pending không
curl http://localhost:3000/api/process-signal-queue | jq '.stats'

# 2. Kiểm tra cron đang chạy
ps aux | grep queue-cron

# 3. Xem logs
tail -f /var/log/signal-queue.log
```

### Signal failed to process

**Nguyên nhân thường gặp:**
- Binance API rate limit
- Network timeout
- Invalid symbol/timeframe
- Không tìm thấy candle khớp

**Kiểm tra:**
```sql
SELECT id, symbol, status, error_message 
FROM signal_queue 
WHERE status='FAILED' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Entry time không chính xác

**Đảm bảo:**
- Signal time phải là openTime của candle (không phải closeTime)
- Timeframe phải đúng format (15m, 1h, 4h, 1d)
- Binance klines API trả về đúng data

## 🧹 Maintenance

### Dọn dẹp signals cũ

```sql
-- Xóa signals đã xử lý sau 30 ngày
DELETE FROM signal_queue
WHERE status IN ('PROCESSED', 'FAILED')
AND processed_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Tự động cleanup với cron

```bash
# Chạy mỗi ngày lúc 2AM
0 2 * * * mysql -u root trade_admin -e "DELETE FROM signal_queue WHERE status IN ('PROCESSED', 'FAILED') AND processed_at < DATE_SUB(NOW(), INTERVAL 30 DAY);"
```

## 📊 Monitoring

### Query thống kê

```sql
-- Success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM signal_queue), 2) as percentage
FROM signal_queue
GROUP BY status;

-- Signals gần đây
SELECT
  symbol,
  timeframe,
  signal_type,
  FROM_UNIXTIME(candle_close_time/1000) as closes_at,
  status
FROM signal_queue
ORDER BY created_at DESC
LIMIT 10;

-- Pending signals sẽ được xử lý
SELECT
  COUNT(*) as ready,
  FROM_UNIXTIME(MIN(candle_close_time)/1000) as next_process_time
FROM signal_queue
WHERE status='PENDING' AND candle_close_time <= UNIX_TIMESTAMP()*1000;
```

## 🎯 Best Practices

1. **Luôn dùng Queue cho fresh signals** (barsSinceSignal = 0)
2. **Chạy cron mỗi 1 phút** để xử lý kịp thời
3. **Monitor queue stats** thường xuyên
4. **Cleanup signals cũ** định kỳ (30 ngày)
5. **Check failed signals** để phát hiện issues

## 📚 Files liên quan

- `lib/db.ts` - Database functions
- `app/api/queue-signal/route.ts` - Add to queue API
- `app/api/process-signal-queue/route.ts` - Process queue API
- `app/signals/page.tsx` - UI với Queue button
- `scripts/process-queue-cron.js` - Cron script đơn giản
- `scripts/queue-cron-service.js` - Cron service với node-cron

## ✅ Checklist triển khai

- [ ] Database table được tạo tự động
- [ ] Test thêm signal vào queue
- [ ] Setup cron job (chọn 1 option phía trên)
- [ ] Verify cron đang chạy
- [ ] Test xử lý queue thành công
- [ ] Kiểm tra signal được lưu vào signal_history
- [ ] Setup monitoring/logging
- [ ] Setup cleanup cron job

---

**Happy Trading! 🚀📈**
