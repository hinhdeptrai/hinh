# Auto Scan Setup Guide

## Tổng quan
Bot tự động scan các symbols trong whitelist để phát hiện breakout signals và tự động queue chúng để trading.

## Luồng hoạt động

### 1. Auto Scan (mỗi 5 phút)
```bash
*/5 * * * * curl -X POST http://localhost:3000/api/auto-scan
```

**Chức năng:**
- Scan tất cả symbols trong `TRADE_SYMBOL_WHITELIST`
- Sử dụng Breakout ATR strategy
- Tự động queue signals nếu tìm thấy
- Log kết quả scan

### 2. Process Queue (mỗi phút)
```bash
* * * * * curl -X POST http://localhost:3000/api/process-signal-queue
```

**Chức năng:**
- Xử lý pending signals
- Risk management checks
- Vào lệnh nếu pass
- Update status

### 3. Monitor Positions (mỗi 10 giây)
```bash
*/10 * * * * curl -X POST http://localhost:3000/api/monitor-positions
```

**Chức năng:**
- Kiểm tra TP/SL triggers
- Tính PnL real-time
- Close positions nếu cần

## Cấu hình

### Environment Variables
```bash
# .env.local
TRADE_SYMBOL_WHITELIST=BTCUSDT,ETHUSDT,ADAUSDT,SOLUSDT
AUTO_TRADE=true
OKX_LEVERAGE=5
DEFAULT_RISK_PERCENT=0.5
```

### Cron Jobs Setup

#### Windows (Task Scheduler)
1. Mở Task Scheduler
2. Tạo task mới:
   - **Name**: Auto Scan Bot
   - **Trigger**: Every 5 minutes
   - **Action**: Start a program
   - **Program**: `curl`
   - **Arguments**: `-X POST http://localhost:3000/api/auto-scan`

#### Linux/Mac (crontab)
```bash
# Mở crontab
crontab -e

# Thêm các dòng sau:
*/5 * * * * curl -X POST http://localhost:3000/api/auto-scan
* * * * * curl -X POST http://localhost:3000/api/process-signal-queue
*/10 * * * * curl -X POST http://localhost:3000/api/monitor-positions
```

## API Endpoints

### POST /api/auto-scan
Tự động scan symbols và queue signals

**Response:**
```json
{
  "success": true,
  "scanned": 4,
  "signals_found": 2,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "results": [
    {
      "symbol": "BTCUSDT",
      "signal": {
        "side": "buy",
        "entry": 50000,
        "sl": 49000,
        "tp": 51200,
        "confidence": 0.8,
        "reason": "Breakout UP (ATR=500)"
      },
      "queued": true,
      "queueId": 123
    }
  ]
}
```

### GET /api/queue-status
Kiểm tra trạng thái queue

### GET /api/system-status
Kiểm tra trạng thái bot

## Strategy Logic

### Breakout ATR Strategy
1. **Entry Conditions:**
   - Có ít nhất 20 nến
   - ATR volatility ≥ 50th percentile
   - Breakout detected:
     - UP: close > max(19 nến trước)
     - DOWN: close < min(19 nến trước)

2. **Risk Management:**
   - SL: entry ± 2*ATR
   - TP: entry ± 2.4*ATR
   - Risk: 0.5% balance
   - Leverage: 5x max

3. **Filters:**
   - Symbol whitelist
   - Cooldown 5 phút
   - Daily loss < 5%
   - Max 3 positions
   - One position per symbol

## Monitoring

### UI Admin Dashboard
- Truy cập: `http://localhost:3000/bot-admin`
- Xem system status, queue status, positions, trade history
- Manual controls: Process Queue, Reset Failed, Remove from Queue

### Logs
- Auto-scan logs: Console output
- Trade logs: Database + Telegram
- Error logs: Console + Telegram alerts

## Troubleshooting

### Common Issues
1. **No signals found:**
   - Kiểm tra volatility (cần ≥ 50th percentile)
   - Kiểm tra breakout conditions
   - Kiểm tra symbol whitelist

2. **Signals not processing:**
   - Kiểm tra candle_close_time
   - Kiểm tra risk management
   - Kiểm tra AUTO_TRADE flag

3. **API errors:**
   - Kiểm tra OKX credentials
   - Kiểm tra network connection
   - Kiểm tra rate limits

### Debug Commands
```bash
# Test auto-scan
curl -X POST http://localhost:3000/api/auto-scan

# Check queue status
curl http://localhost:3000/api/queue-status

# Check system status
curl http://localhost:3000/api/system-status
```

## Performance

### Expected Results
- Scan time: ~2-3 seconds per symbol
- Signal detection: ~10-20% of scans
- Processing time: ~1-2 seconds per signal
- Monitoring: Real-time updates

### Optimization
- Sử dụng connection pooling
- Cache instrument metadata
- Batch API calls
- Optimize database queries
