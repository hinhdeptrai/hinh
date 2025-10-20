## OKX ENV cấu hình

Thêm các biến môi trường vào `.env.local` (hoặc môi trường server):

```
# Chế độ mô phỏng (paper). true = không đặt lệnh thật, dùng x-simulated-trading
OKX_PAPER=true

# Bật simulated trading header (1 = demo)
OKX_DEMO=1

# API Credentials
OKX_API_KEY=your_key
OKX_API_SECRET=your_secret
OKX_API_PASSPHRASE=your_passphrase

# Trading settings
OKX_TD_MODE=cross
OKX_PAPER_BALANCE=1000
```

Ghi chú:
- Để giao dịch thật, đặt `OKX_PAPER=false` và `OKX_DEMO=0` (bạn cần tài khoản/permission OKX phù hợp).
- Mặc định code sẽ ở chế độ paper để an toàn.


