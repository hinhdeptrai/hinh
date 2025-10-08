# 🎯 Multi-Indicator System - Implementation Plan

## 📋 Overview

Cho phép user chọn indicator strategy khác nhau cho mỗi symbol, thay vì chỉ dùng Fibonacci Algo cố định.

## 🏗️ Architecture Design

### 1. Indicator Types
```typescript
export type IndicatorType =
  | 'FIBONACCI_ALGO'      // Current implementation
  | 'RSI_MACD_EMA'        // 73% win rate
  | 'MACD_BB'             // 78% win rate
  | 'RSI_VOLUME_BB'       // 70% win rate
  | 'SUPERTREND_EMA'      // 65% win rate
  | 'EMA_CROSS_RSI'       // 60% win rate
```

### 2. Database Schema

```sql
-- Table: symbol_indicator_settings
CREATE TABLE IF NOT EXISTS symbol_indicator_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  indicator_type ENUM(
    'FIBONACCI_ALGO',
    'RSI_MACD_EMA',
    'MACD_BB',
    'RSI_VOLUME_BB',
    'SUPERTREND_EMA',
    'EMA_CROSS_RSI'
  ) NOT NULL DEFAULT 'FIBONACCI_ALGO',
  settings JSON NULL COMMENT 'Custom settings for indicator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_symbol_tf (symbol, timeframe)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. File Structure

```
lib/
├── indicators/
│   ├── index.ts                  # Main entry point
│   ├── types.ts                  # Shared types
│   ├── fibonacci-algo.ts         # Current algo (refactored)
│   ├── rsi-macd-ema.ts          # New: RSI + MACD + EMA
│   ├── macd-bb.ts               # New: MACD + Bollinger Bands
│   ├── rsi-volume-bb.ts         # New: RSI + Volume + BB
│   ├── supertrend-ema.ts        # New: Supertrend + EMA
│   ├── ema-cross-rsi.ts         # New: EMA Crossover + RSI
│   └── utils/
│       ├── technical.ts          # Technical indicators (RSI, MACD, BB, etc)
│       ├── volume.ts             # Volume indicators
│       └── supertrend.ts         # Supertrend calculation

app/api/
├── indicator-settings/
│   └── route.ts                  # CRUD for indicator settings
└── scan/
    └── route.ts                  # Modified to support multiple indicators
```

## 📝 Implementation Steps

### Phase 1: Foundation (Day 1-2)

#### 1.1 Create Indicator System Structure
```typescript
// lib/indicators/types.ts
export type IndicatorType = 'FIBONACCI_ALGO' | 'RSI_MACD_EMA' | ...;

export type IndicatorResult = {
  signal: 'BUY' | 'SELL' | 'NONE';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  confidence: number; // 0-100
  reasons: string[]; // Why this signal?
};

export interface BaseIndicator {
  analyze(data: KlineData, settings?: any): Promise<IndicatorResult>;
  getName(): string;
  getDescription(): string;
  getDefaultSettings(): any;
}
```

#### 1.2 Database Migration
```sql
-- Create indicator settings table
-- Add indexes
-- Seed default values
```

#### 1.3 Refactor Current Algo
Move `lib/indicator.ts` logic to `lib/indicators/fibonacci-algo.ts` implementing `BaseIndicator` interface.

---

### Phase 2: Implement High-Priority Indicators (Day 3-5)

#### 2.1 MACD + Bollinger Bands (78% WR)
```typescript
// lib/indicators/macd-bb.ts
export class MacdBBIndicator implements BaseIndicator {
  async analyze(data: KlineData) {
    // 1. Calculate MACD(12,26,9)
    // 2. Calculate BB(20,2)
    // 3. Check entry conditions:
    //    - BUY: Price touches lower BB + MACD crosses up
    //    - SELL: Price touches upper BB + MACD crosses down
    // 4. Calculate SL/TP based on BB width
    // 5. Return IndicatorResult
  }
}
```

#### 2.2 RSI + MACD + EMA (73% WR)
```typescript
// lib/indicators/rsi-macd-ema.ts
export class RsiMacdEmaIndicator implements BaseIndicator {
  async analyze(data: KlineData) {
    // 1. Calculate RSI(14)
    // 2. Calculate MACD(12,26,9)
    // 3. Calculate EMA(21)
    // 4. Check conditions:
    //    - BUY: RSI < 30 + MACD histogram > 0 + Price > EMA21
    //    - SELL: RSI > 70 + MACD histogram < 0 + Price < EMA21
    // 5. Calculate SL/TP
  }
}
```

#### 2.3 RSI + Volume + BB (70% WR)
```typescript
// lib/indicators/rsi-volume-bb.ts
export class RsiVolumeBBIndicator implements BaseIndicator {
  async analyze(data: KlineData) {
    // 1. Calculate RSI(14)
    // 2. Calculate Volume average
    // 3. Calculate BB(20,2)
    // 4. Check conditions:
    //    - BUY: RSI < 30 + Price < Lower BB + Volume spike
    //    - SELL: RSI > 70 + Price > Upper BB + Volume spike
  }
}
```

---

### Phase 3: Technical Utilities (Day 6-7)

#### 3.1 Technical Indicators Library
```typescript
// lib/indicators/utils/technical.ts

export function calculateRSI(closes: number[], period: number = 14): number[] {
  // RSI calculation
}

export function calculateMACD(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  // MACD calculation
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  // Bollinger Bands calculation
}

export function calculateSupertrend(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 10,
  multiplier: number = 3
): { supertrend: number[]; direction: number[] } {
  // Supertrend calculation
}
```

#### 3.2 Volume Analysis
```typescript
// lib/indicators/utils/volume.ts

export function isVolumeSpike(
  volumes: number[],
  threshold: number = 1.5
): boolean {
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b) / 20;
  const currentVolume = volumes[volumes.length - 1];
  return currentVolume > avgVolume * threshold;
}

export function calculateVolumeMA(
  volumes: number[],
  period: number = 20
): number[] {
  // Volume moving average
}
```

---

### Phase 4: API & Settings (Day 8-9)

#### 4.1 Indicator Settings API
```typescript
// app/api/indicator-settings/route.ts

// GET /api/indicator-settings?symbol=BTCUSDT&timeframe=4h
export async function GET(req: NextRequest) {
  // Get indicator settings for symbol+timeframe
}

// POST /api/indicator-settings
export async function POST(req: NextRequest) {
  // Save indicator settings
  const body = await req.json();
  // { symbol, timeframe, indicator_type, settings }
}

// DELETE /api/indicator-settings
export async function DELETE(req: NextRequest) {
  // Reset to default (FIBONACCI_ALGO)
}
```

#### 4.2 Modify Scan API
```typescript
// app/api/scan/route.ts

export async function POST(req: NextRequest) {
  const { symbol, timeframe } = await req.json();

  // 1. Load indicator settings for this symbol+timeframe
  const settings = await getIndicatorSettings(symbol, timeframe);

  // 2. Select appropriate indicator
  const indicator = IndicatorFactory.create(settings.indicator_type);

  // 3. Analyze
  const result = await indicator.analyze(klineData, settings.settings);

  // 4. Return result
  return NextResponse.json(result);
}
```

---

### Phase 5: UI Integration (Day 10-12)

#### 5.1 Indicator Selector Component
```typescript
// components/indicator-selector.tsx

export function IndicatorSelector({
  symbol,
  timeframe,
  currentIndicator,
  onSelect
}: IndicatorSelectorProps) {
  return (
    <Select value={currentIndicator} onValueChange={onSelect}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MACD_BB">
          🏆 MACD + BB (78% WR)
        </SelectItem>
        <SelectItem value="RSI_MACD_EMA">
          ⭐ RSI + MACD + EMA (73% WR)
        </SelectItem>
        <SelectItem value="RSI_VOLUME_BB">
          📊 RSI + Volume + BB (70% WR)
        </SelectItem>
        <SelectItem value="SUPERTREND_EMA">
          📈 Supertrend + EMA (65% WR)
        </SelectItem>
        <SelectItem value="FIBONACCI_ALGO">
          🎯 Fibonacci Algo (Current)
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
```

#### 5.2 Settings Dialog
```typescript
// components/indicator-settings-dialog.tsx

export function IndicatorSettingsDialog({
  symbol,
  timeframe,
  indicator
}: SettingsDialogProps) {
  // Show customizable settings for each indicator
  // Example: RSI period, MACD parameters, BB stdDev, etc.
}
```

#### 5.3 Update Main Page
```typescript
// app/page.tsx

// Add indicator selector for each symbol
<div className="flex items-center gap-2">
  <span>{symbol}</span>
  <IndicatorSelector
    symbol={symbol}
    timeframe="4h"
    currentIndicator={indicatorSettings[symbol]}
    onSelect={(ind) => saveIndicatorSetting(symbol, ind)}
  />
</div>
```

---

## 🎨 UI Mockup

### Indicator Table
```
┌─────────────────────────────────────────────────────────────┐
│ Symbol    │ Timeframe │ Indicator             │ Last Signal │
├───────────┼───────────┼───────────────────────┼─────────────┤
│ BTCUSDT   │ 4h        │ 🏆 MACD+BB (78%)      │ BUY         │
│           │           │ [Change] [Settings]    │ 2h ago      │
├───────────┼───────────┼───────────────────────┼─────────────┤
│ ETHUSDT   │ 1h        │ ⭐ RSI+MACD+EMA (73%) │ SELL        │
│           │           │ [Change] [Settings]    │ 30m ago     │
├───────────┼───────────┼───────────────────────┼─────────────┤
│ BNBUSDT   │ 15m       │ 📈 Supertrend+EMA     │ NONE        │
│           │           │ [Change] [Settings]    │ -           │
└─────────────────────────────────────────────────────────────┘
```

### Settings Dialog
```
┌──────────────────────────────────────────┐
│ 🏆 MACD + Bollinger Bands Settings      │
├──────────────────────────────────────────┤
│                                          │
│ MACD Fast Period:    [12]               │
│ MACD Slow Period:    [26]               │
│ MACD Signal Period:  [9]                │
│                                          │
│ BB Period:           [20]               │
│ BB StdDev:           [2.0]              │
│                                          │
│ TP1 Percentage:      [0.5%]            │
│ TP2 Percentage:      [1.0%]            │
│ TP3 Percentage:      [2.0%]            │
│ Stop Loss:           [-1.5%]           │
│                                          │
│        [Reset to Default]  [Save]       │
└──────────────────────────────────────────┘
```

---

## 📊 Data Flow

```
User selects indicator
      ↓
Save to DB (symbol_indicator_settings)
      ↓
Scan API loads settings
      ↓
Create indicator instance
      ↓
Fetch kline data
      ↓
Run indicator analysis
      ↓
Return signal + entry/SL/TP
      ↓
Display in UI
```

---

## 🧪 Testing Plan

### Unit Tests
```typescript
describe('MacdBBIndicator', () => {
  it('should generate BUY signal when price touches lower BB and MACD crosses up', async () => {
    // Test logic
  });

  it('should calculate proper SL/TP levels', async () => {
    // Test logic
  });
});
```

### Integration Tests
```typescript
describe('Indicator Selection System', () => {
  it('should save indicator settings to database', async () => {
    // Test API
  });

  it('should scan with selected indicator', async () => {
    // Test scan with different indicators
  });
});
```

### Backtest
```typescript
// scripts/backtest-indicator.ts
// Backtest each indicator on historical data
// Compare win rates
// Generate report
```

---

## 🚀 Deployment Checklist

- [ ] Database migration
- [ ] Implement indicators
- [ ] API endpoints
- [ ] UI components
- [ ] Testing
- [ ] Documentation
- [ ] Backtest validation
- [ ] Deploy to production

---

## 📚 Next Steps After Launch

1. **Add More Indicators**
   - Ichimoku Cloud
   - Stochastic RSI
   - ADX + DI
   - Custom combinations

2. **Backtesting Dashboard**
   - Visual comparison of strategies
   - Historical performance
   - Win rate charts

3. **Auto-Optimization**
   - ML to find best indicator per symbol
   - Auto-adjust parameters

4. **Alert System**
   - Notify when indicator changes
   - Multi-indicator consensus alerts

---

**Estimated Timeline:** 2 weeks
**Priority:** High (improves win rate significantly)
**Complexity:** Medium-High
