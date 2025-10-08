# 🎯 Multi-Indicator System - Hướng dẫn sử dụng

## 📋 Tổng quan

Hệ thống multi-indicator cho phép bạn chọn các chiến lược trading khác nhau cho mỗi symbol, thay vì chỉ sử dụng một indicator duy nhất.

## 🚀 Các Indicator đã implement

### 1. 🏆 MACD + Bollinger Bands (Win Rate: 78%)
**Priority: CAO NHẤT**

**Logic:**
- **BUY**: Giá chạm Lower BB + MACD histogram cross lên trên 0
- **SELL**: Giá chạm Upper BB + MACD histogram cross xuống dưới 0

**Settings mặc định:**
```typescript
{
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,
  BB_PERIOD: 20,
  BB_STD_DEV: 2,
  MIN_VOLUME_MULTIPLIER: 1.2,
  TP1-6: 0.5%, 1%, 2%, 3%, 7.5%, 16.5%
  SL: 2%
}
```

**Khi nào dùng:**
- Market có volatility cao (BB rộng)
- Có volume confirmation
- Tốt cho swing trading

---

### 2. ⭐ RSI + MACD + EMA (Win Rate: 73%)

**Logic:**
- **BUY**: RSI < 30 (oversold) + MACD histogram > 0 + Giá > EMA21
- **SELL**: RSI > 70 (overbought) + MACD histogram < 0 + Giá < EMA21

**Settings mặc định:**
```typescript
{
  RSI_PERIOD: 14,
  RSI_OVERBOUGHT: 70,
  RSI_OVERSOLD: 30,
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,
  EMA_PERIOD: 21,
  TP1-6: 0.5%, 1%, 2%, 3%, 7.5%, 16.5%
  SL: 2.5%
}
```

**Khi nào dùng:**
- Market trending rõ ràng
- RSI extreme values (< 25 hoặc > 75) → confidence cao hơn
- Tốt cho day trading

---

### 3. 🎯 Fibonacci Algo (Current - Đang refactor)
- Logic cũ từ indicator.ts
- Sử dụng pivot points + MA filter + Cup patterns
- Sẽ được refactor thành module riêng

---

## 📊 Cấu trúc File System

```
lib/
├── indicators/
│   ├── types.ts                  # Type definitions
│   ├── factory.ts                # Indicator factory & kline fetching
│   ├── macd-bb.ts               # MACD + BB indicator
│   ├── rsi-macd-ema.ts          # RSI + MACD + EMA indicator
│   ├── fibonacci-algo.ts        # (Pending) Refactored Fibonacci
│   └── utils/
│       └── technical.ts          # Technical indicator calculations

app/api/
└── indicator-settings/
    └── route.ts                  # CRUD API cho indicator settings

components/
└── indicator-selector.tsx        # UI component chọn indicator
```

---

## 🔧 Cách sử dụng

### 1. Chọn Indicator cho Symbol

Trên trang chính, mỗi symbol sẽ có dropdown **Indicator** để chọn:

```
┌─────────────────────────────────────────┐
│ Symbol    │ Indicator         │ Signal  │
├───────────┼───────────────────┼─────────┤
│ BTCUSDT   │ [🏆 MACD+BB 78%] │ BUY     │
│ ETHUSDT   │ [⭐ RSI+MACD 73%]│ SELL    │
│ BNBUSDT   │ [🎯 Fibonacci]   │ NONE    │
└─────────────────────────────────────────┘
```

### 2. API Endpoints

**GET /api/indicator-settings?symbol=BTCUSDT&timeframe=4h**
- Lấy indicator setting hiện tại
- Trả về default nếu chưa set

**POST /api/indicator-settings**
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "4h",
  "indicator_type": "MACD_BB",
  "settings": null  // hoặc custom settings
}
```

**DELETE /api/indicator-settings?symbol=BTCUSDT&timeframe=4h**
- Reset về Fibonacci Algo (default)

### 3. Database

Table: `symbol_indicator_settings`
```sql
CREATE TABLE symbol_indicator_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  indicator_type ENUM(...) DEFAULT 'FIBONACCI_ALGO',
  settings JSON NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE KEY (symbol, timeframe)
);
```

---

## 🎨 Confidence Scoring

Mỗi indicator tính confidence score (0-100):

**MACD + BB:**
- Base: 50
- Volume confirmed: +15
- Signal fresh: +10
- BB wide (>4%): +10
- BB narrow (<2%): -10

**RSI + MACD + EMA:**
- Base: 50
- Volume confirmed: +15
- Signal fresh: +10
- RSI extreme (<25 or >75): +10
- RSI very extreme (<20 or >80): +5

---

## 📝 Cách thêm Indicator mới

### 1. Tạo class implement BaseIndicator

```typescript
// lib/indicators/my-indicator.ts
import type { BaseIndicator, Klines, IndicatorResult } from './types'

export class MyIndicator implements BaseIndicator {
  getName(): string {
    return 'My Strategy'
  }

  getDescription(): string {
    return 'Strategy description'
  }

  getWinRate(): number {
    return 65 // Expected win rate
  }

  getDefaultSettings() {
    return {
      PARAM1: 20,
      PARAM2: 50,
      // ... TP/SL settings
    }
  }

  async analyze(data: Klines, settings?: any): Promise<IndicatorResult> {
    // Implement your logic here
    // Calculate indicators
    // Generate signals
    // Return IndicatorResult
  }
}
```

### 2. Register vào Factory

```typescript
// lib/indicators/factory.ts
import { MyIndicator } from './my-indicator'

static {
  IndicatorFactory.indicators.set('MY_INDICATOR', new MyIndicator())
}
```

### 3. Update Types

```typescript
// lib/indicators/types.ts
export type IndicatorType =
  | 'FIBONACCI_ALGO'
  | 'MACD_BB'
  | 'RSI_MACD_EMA'
  | 'MY_INDICATOR'  // Add here
```

### 4. Update Database ENUM

```sql
ALTER TABLE symbol_indicator_settings
MODIFY COLUMN indicator_type ENUM(
  'FIBONACCI_ALGO',
  'MACD_BB',
  'RSI_MACD_EMA',
  'MY_INDICATOR'  -- Add here
);
```

---

## 🧪 Testing

### Manual Test Checklist

- [ ] Chọn indicator từ dropdown
- [ ] Verify API call save thành công
- [ ] Reload page, verify setting được load
- [ ] Test với multiple symbols khác nhau
- [ ] Test reset to default
- [ ] Verify signals được generate đúng theo indicator đã chọn

### Unit Test (Future)

```typescript
describe('MacdBBIndicator', () => {
  it('should generate BUY when price touches lower BB and MACD crosses up', async () => {
    // Test case
  })

  it('should calculate confidence correctly', async () => {
    // Test case
  })
})
```

---

## 📈 Roadmap

### Phase 1: ✅ Hoàn thành
- [x] Database schema
- [x] Type definitions
- [x] MACD + BB indicator
- [x] RSI + MACD + EMA indicator
- [x] API endpoints
- [x] UI component
- [x] Integration vào page.tsx

### Phase 2: 🔄 Đang làm
- [ ] Refactor Fibonacci Algo
- [ ] Test toàn bộ hệ thống
- [ ] Bug fixes

### Phase 3: 📝 Future
- [ ] RSI + Volume + BB indicator (70% WR)
- [ ] Supertrend + EMA indicator (65% WR)
- [ ] EMA Cross + RSI indicator (60% WR)
- [ ] Backtesting module
- [ ] Performance comparison dashboard
- [ ] Auto-optimization based on symbol performance

---

## 🚨 Important Notes

1. **Default Indicator**: Tất cả symbols mới sẽ dùng `FIBONACCI_ALGO` mặc định
2. **Timeframe Specific**: Settings được lưu per symbol + timeframe
3. **Auto Reload**: Khi đổi indicator, page sẽ tự động reload data
4. **Confidence Score**: Dùng để filter signals chất lượng cao
5. **Win Rate**: Là expected win rate dựa trên backtest (cần verify thực tế)

---

## 🐛 Troubleshooting

**Lỗi: "Indicator type not found"**
- Check xem indicator đã được register trong Factory chưa
- Verify type name khớp với enum

**Setting không save**
- Check database connection
- Verify symbol + timeframe format
- Check API endpoint logs

**Signal không đúng**
- Verify indicator logic
- Check kline data fetching
- Debug confidence calculation

---

## 📞 Support

- GitHub Issues: Report bugs tại repository
- Documentation: Xem thêm tại `/docs`
- Contact: team@trading.app

---

**Version:** 1.0.0
**Last Updated:** 2025-01-08
**Author:** Trading System Team
