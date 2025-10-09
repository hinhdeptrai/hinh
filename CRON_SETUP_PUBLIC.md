# 🎯 Signal Queue System - Cron Setup

## Public API Endpoints

### 1. Process Queue (Dùng cho cron)
**URL:** `https://yourdomain.com/api/process-signal-queue`  
**Method:** `GET`
- Xử lý tất cả pending signals đã đóng nến
- Tự động import vào tracking

### 2. Check Status (Optional)
**URL:** `https://yourdomain.com/api/queue-status`  
**Method:** `GET`
- Chỉ xem status, không xử lý

## ⚙️ Setup Cron Job

### Option 1: Vercel Cron (Production - Khuyên dùng)

Tạo file `vercel.json` ở root project:

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

Deploy lên Vercel và cron sẽ tự động chạy mỗi phút.

### Option 2: External Cron Service

#### [cron-job.org](https://cron-job.org) (Miễn phí)

1. Đăng ký tài khoản tại https://cron-job.org
2. Tạo cronjob mới:
   - **Title:** Signal Queue Processor
   - **URL:** `https://yourdomain.com/api/process-signal-queue`
   - **Method:** GET
   - **Schedule:** Every 1 minute
   - **Execution:** ⏰ `* * * * *`

#### [EasyCron](https://www.easycron.com) (Miễn phí 1 job)

1. Đăng ký tại https://www.easycron.com
2. Create Cron Job:
   - **URL:** `https://yourdomain.com/api/process-signal-queue`
   - **Cron Expression:** `* * * * *`

### Option 3: Linux/Mac Crontab

```bash
# Mở crontab editor
crontab -e

# Thêm dòng này (chạy mỗi phút)
* * * * * curl https://yourdomain.com/api/process-signal-queue
```

Với logging:
```bash
* * * * * curl https://yourdomain.com/api/process-signal-queue >> /var/log/signal-queue.log 2>&1
```

## 🧪 Test API

### Xử lý queue (GET)

```bash
curl https://yourdomain.com/api/process-signal-queue
```

Response:
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
      "entry_time": "2024-01-15T14:15:00.000Z",
      "entry_price": 42156.8
    }
  ],
  "stats": {
    "total": 15,
    "pending": 5,
    "processed": 9,
    "failed": 1
  }
}
```

### Kiểm tra status (GET)

```bash
curl https://yourdomain.com/api/queue-status
```

Response:
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
  "pending_signals": [...]
}
```

## 🔒 Bảo mật (Optional)

Nếu muốn bảo vệ API, thêm API key:

### Cách 1: Query Parameter

```typescript
// app/api/process-signal-queue/route.ts
export async function POST(req: NextRequest) {
  const apiKey = req.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.CRON_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of code
}
```

Gọi với:
```bash
curl -X POST "https://yourdomain.com/api/process-signal-queue?key=YOUR_SECRET_KEY"
```

### Cách 2: Header Authorization

```typescript
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_API_KEY}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of code
}
```

Gọi với:
```bash
curl -X POST https://yourdomain.com/api/process-signal-queue \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

## 📊 Monitoring

### Kiểm tra cron có chạy không

```bash
# Check pending signals
curl https://yourdomain.com/api/process-signal-queue | jq '.stats.pending'

# Check last processed time
mysql -u root -p trade_admin -e "
  SELECT MAX(processed_at) as last_run 
  FROM signal_queue 
  WHERE status='PROCESSED'
"
```

### Alerts khi có lỗi

Setup webhook notification trong cron service hoặc check failed count:

```bash
# Get failed signals
curl https://yourdomain.com/api/queue-status | jq '.stats.failed'
```

## 🎯 Khuyến nghị

1. **Dùng Vercel Cron** nếu deploy trên Vercel (miễn phí, reliable)
2. **Dùng cron-job.org** nếu deploy ở nơi khác (miễn phí, dễ setup)
3. **Thêm monitoring** để biết khi nào cron ngừng hoạt động
4. **Setup alerts** khi có signals failed

## 🚀 Quick Start

### Development (Local)

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test cron manually
curl http://localhost:3000/api/process-signal-queue
```

### Production

1. Deploy app lên Vercel/server
2. Chọn 1 cron option phía trên
3. Setup với URL: `https://yourdomain.com/api/process-signal-queue`
4. Verify cron chạy: Check stats API hoặc database

---

**Hoàn thành! 🎉** 

**Cron URL:** `GET /api/process-signal-queue`  
Chỉ cần gọi URL này mỗi 1 phút!
