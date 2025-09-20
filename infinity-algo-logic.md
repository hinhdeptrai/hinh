# Infinity Algo Trading Indicator - Complete Logic Implementation

## Overview
This document provides a comprehensive breakdown of the Infinity Algo trading indicator logic and includes a complete Pine Script implementation based on the core principles identified from research.

## Core Logic Components

### 1. **Pivot Level Detection (Primary Signal Generator)**
- **Function**: Identifies key support and resistance levels based on pivot highs/lows
- **Parameters**: 
  - Pivot Period: 2-20 (default: 5)
  - Minimum Tests: 2-5 level touches required
  - Threshold Rate: 3-10% tolerance for level testing
- **Logic**: Tracks historical pivot points and counts how many times price has tested each level

### 2. **Moving Average Trend Filter**
- **Function**: Confirms trend direction to filter signals
- **Options**: EMA or SMA (configurable)
- **Default Length**: 21 periods
- **Logic**: 
  - Buy signals only when price > MA (bullish trend)
  - Sell signals only when price < MA (bearish trend)

### 3. **Heiken Ashi Noise Filtering (Optional)**
- **Function**: Smooths price action to reduce false signals
- **Implementation**: Optional toggle for cleaner trend identification
- **Logic**: Uses Heiken Ashi calculations instead of regular OHLC when enabled

### 4. **Cup Pattern Recognition**
- **Function**: Identifies bullish/bearish reversal patterns
- **Bullish Cup**: Low[10] > Low[5] < Low[0] with price above MA
- **Bearish Cup**: High[10] < High[5] > High[0] with price below MA
- **Purpose**: Additional confirmation for entry signals

### 5. **Risk Management System**
- **6 Take Profit Levels**:
  - TP1: 0.3%, TP2: 1.0%, TP3: 2.0%
  - TP4: 3.0%, TP5: 7.5%, TP6: 16.5%
- **Stop Loss**: 4.5% (configurable for long/short)
- **Separate settings for long and short positions**

## Signal Generation Logic

### Entry Conditions
**BUY SIGNAL** triggered when ALL conditions met:
1. Price breaks above a tested resistance level (pivot breakout)
2. Resistance level has been tested minimum required times
3. Moving average filter confirms bullish trend (price > MA)
4. Cup pattern confirmation (if enabled)

**SELL SIGNAL** triggered when ALL conditions met:
1. Price breaks below a tested support level (pivot breakdown)  
2. Support level has been tested minimum required times
3. Moving average filter confirms bearish trend (price < MA)
4. Bearish cup pattern confirmation (if enabled)

### Key Settings for Optimization
- **Period**: Higher = more accurate, fewer signals
- **Threshold Rate**: Higher = more frequent signals, potentially less accurate
- **MA Length**: Shorter = more responsive, longer = more stable
- **Minimum Tests**: Higher = more reliable levels, fewer signals

## Complete Pine Script Implementation

```pinescript
//@version=5
indicator("Infinity Algo - Logic Implementation", shorttitle="InfinityAlgo", overlay=true)

// ============================================================================
// INPUTS & SETTINGS
// ============================================================================

// Pivot Settings
pivot_period = input.int(5, "Pivot Period", minval=2, maxval=20, tooltip="Higher values = more accurate but fewer signals")
max_breakout_length = input.int(250, "Max Breakout Length (bars)", minval=200, maxval=500)
threshold_rate = input.float(5.0, "Threshold Rate %", minval=3.0, maxval=10.0, step=0.5)
min_tests = input.int(2, "Minimum Number of Tests", minval=2, maxval=5)

// Moving Average Settings
ma_type = input.string("EMA", "MA Type", options=["SMA", "EMA"])
ma_length = input.int(21, "MA Length", minval=5, maxval=100)
ma_filter = input.bool(true, "Enable MA Filter")

// Heiken Ashi Settings
use_heiken_ashi = input.bool(false, "Use Heiken Ashi Calculation")

// Pattern Detection
enable_cup_pattern = input.bool(true, "Enable Cup Pattern Detection")

// Risk Management
tp1_long = input.float(0.3, "TP1 Long %", step=0.1) / 100
tp2_long = input.float(1.0, "TP2 Long %", step=0.1) / 100
tp3_long = input.float(2.0, "TP3 Long %", step=0.1) / 100
tp4_long = input.float(3.0, "TP4 Long %", step=0.1) / 100
tp5_long = input.float(7.5, "TP5 Long %", step=0.1) / 100
tp6_long = input.float(16.5, "TP6 Long %", step=0.1) / 100

tp1_short = input.float(0.3, "TP1 Short %", step=0.1) / 100
tp2_short = input.float(1.0, "TP2 Short %", step=0.1) / 100
tp3_short = input.float(2.0, "TP3 Short %", step=0.1) / 100
tp4_short = input.float(3.0, "TP4 Short %", step=0.1) / 100
tp5_short = input.float(7.5, "TP5 Short %", step=0.1) / 100
tp6_short = input.float(16.5, "TP6 Short %", step=0.1) / 100

sl_long = input.float(4.5, "Stop Loss Long %", step=0.1) / 100
sl_short = input.float(4.5, "Stop Loss Short %", step=0.1) / 100

// ============================================================================
// CORE CALCULATIONS
// ============================================================================

// Heiken Ashi Calculation
ha_close = use_heiken_ashi ? (open + high + low + close) / 4 : close
ha_open = use_heiken_ashi ? (nz(ha_open[1]) + nz(ha_close[1])) / 2 : open
ha_high = use_heiken_ashi ? math.max(high, math.max(ha_open, ha_close)) : high
ha_low = use_heiken_ashi ? math.min(low, math.min(ha_open, ha_close)) : low

// Use Heiken Ashi or regular OHLC
src_high = use_heiken_ashi ? ha_high : high
src_low = use_heiken_ashi ? ha_low : low
src_close = use_heiken_ashi ? ha_close : close
src_open = use_heiken_ashi ? ha_open : open

// Moving Average Calculation
ma = ma_type == "EMA" ? ta.ema(src_close, ma_length) : ta.sma(src_close, ma_length)

// Pivot High/Low Detection
pivot_high = ta.pivothigh(src_high, pivot_period, pivot_period)
pivot_low = ta.pivotlow(src_low, pivot_period, pivot_period)

// ============================================================================
// PIVOT LEVEL TRACKING & BREAKOUT DETECTION
// ============================================================================

var float[] resistance_levels = array.new<float>()
var float[] support_levels = array.new<float>()
var int[] resistance_tests = array.new<int>()
var int[] support_tests = array.new<int>()

// Add new pivot levels
if not na(pivot_high)
    array.push(resistance_levels, pivot_high)
    array.push(resistance_tests, 1)
    
if not na(pivot_low)
    array.push(support_levels, pivot_low)
    array.push(support_tests, 1)

// Clean old levels (keep only recent ones)
if array.size(resistance_levels) > max_breakout_length / 10
    array.shift(resistance_levels)
    array.shift(resistance_tests)
    
if array.size(support_levels) > max_breakout_length / 10
    array.shift(support_levels)
    array.shift(support_tests)

// Test levels and count touches
for i = 0 to array.size(resistance_levels) - 1
    level = array.get(resistance_levels, i)
    if math.abs(src_high - level) <= level * (threshold_rate / 100)
        array.set(resistance_tests, i, array.get(resistance_tests, i) + 1)

for i = 0 to array.size(support_levels) - 1
    level = array.get(support_levels, i)
    if math.abs(src_low - level) <= level * (threshold_rate / 100)
        array.set(support_tests, i, array.get(support_tests, i) + 1)

// ============================================================================
// CUP PATTERN DETECTION
// ============================================================================

// Bullish Cup Pattern (simplified)
bullish_cup = enable_cup_pattern and 
              src_low[10] > src_low[5] and 
              src_low[5] < src_low[0] and 
              src_close > src_close[5] and
              src_close > ma

// Bearish Cup Pattern (simplified)
bearish_cup = enable_cup_pattern and 
              src_high[10] < src_high[5] and 
              src_high[5] > src_high[0] and 
              src_close < src_close[5] and
              src_close < ma

// ============================================================================
// SIGNAL GENERATION
// ============================================================================

// Breakout Detection
breakout_up = false
breakout_down = false

// Check for resistance breakouts
for i = 0 to array.size(resistance_levels) - 1
    level = array.get(resistance_levels, i)
    tests = array.get(resistance_tests, i)
    if src_close > level and tests >= min_tests and src_close[1] <= level
        breakout_up := true

// Check for support breakdowns
for i = 0 to array.size(support_levels) - 1
    level = array.get(support_levels, i)
    tests = array.get(support_tests, i)
    if src_close < level and tests >= min_tests and src_close[1] >= level
        breakout_down := true

// Moving Average Filter
ma_bullish = not ma_filter or src_close > ma
ma_bearish = not ma_filter or src_close < ma

// Final Buy/Sell Signals
buy_signal = breakout_up and ma_bullish and (not enable_cup_pattern or bullish_cup)
sell_signal = breakout_down and ma_bearish and (not enable_cup_pattern or bearish_cup)

// ============================================================================
// SIGNAL PLOTTING & ALERTS
// ============================================================================

// Plot signals
plotshape(buy_signal, title="Buy Signal", location=location.belowbar, 
          color=color.new(color.green, 0), style=shape.labelup, size=size.normal, text="BUY")

plotshape(sell_signal, title="Sell Signal", location=location.abovebar, 
          color=color.new(color.red, 0), style=shape.labeldown, size=size.normal, text="SELL")

// Plot Moving Average
plot(ma_filter ? ma : na, title="MA", color=color.blue, linewidth=1)

// Calculate and plot Take Profit and Stop Loss levels
if buy_signal
    tp1_level = src_close * (1 + tp1_long)
    tp2_level = src_close * (1 + tp2_long)
    tp3_level = src_close * (1 + tp3_long)
    tp4_level = src_close * (1 + tp4_long)
    tp5_level = src_close * (1 + tp5_long)
    tp6_level = src_close * (1 + tp6_long)
    sl_level = src_close * (1 - sl_long)
    
    line.new(bar_index, tp1_level, bar_index + 20, tp1_level, color=color.green, width=1, style=line.style_dashed)
    line.new(bar_index, tp2_level, bar_index + 20, tp2_level, color=color.green, width=1, style=line.style_dashed)
    line.new(bar_index, tp3_level, bar_index + 20, tp3_level, color=color.green, width=1, style=line.style_dashed)
    line.new(bar_index, sl_level, bar_index + 20, sl_level, color=color.red, width=2, style=line.style_solid)

if sell_signal
    tp1_level = src_close * (1 - tp1_short)
    tp2_level = src_close * (1 - tp2_short)
    tp3_level = src_close * (1 - tp3_short)
    tp4_level = src_close * (1 - tp4_short)
    tp5_level = src_close * (1 - tp5_short)
    tp6_level = src_close * (1 - tp6_short)
    sl_level = src_close * (1 + sl_short)
    
    line.new(bar_index, tp1_level, bar_index + 20, tp1_level, color=color.green, width=1, style=line.style_dashed)
    line.new(bar_index, tp2_level, bar_index + 20, tp2_level, color=color.green, width=1, style=line.style_dashed)
    line.new(bar_index, tp3_level, bar_index + 20, tp3_level, color=color.green, width=1, style=line.style_dashed)
    line.new(bar_index, sl_level, bar_index + 20, sl_level, color=color.red, width=2, style=line.style_solid)

// Alerts
alertcondition(buy_signal, title="Infinity Algo Buy", 
               message="🟢 INFINITY ALGO BUY SIGNAL\n" + 
                      "Entry: {{close}}\n" + 
                      "TP1: {{close}}*" + str.tostring(1 + tp1_long) + "\n" +
                      "TP2: {{close}}*" + str.tostring(1 + tp2_long) + "\n" +
                      "SL: {{close}}*" + str.tostring(1 - sl_long))

alertcondition(sell_signal, title="Infinity Algo Sell", 
               message="🔴 INFINITY ALGO SELL SIGNAL\n" + 
                      "Entry: {{close}}\n" + 
                      "TP1: {{close}}*" + str.tostring(1 - tp1_short) + "\n" +
                      "TP2: {{close}}*" + str.tostring(1 - tp2_short) + "\n" +
                      "SL: {{close}}*" + str.tostring(1 + sl_short))
```

## Implementation Instructions

1. **Copy the Pine Script** code into TradingView's Pine Editor
2. **Save and Add to Chart** - the indicator will overlay on your price chart
3. **Adjust Settings**:
   - Start with default settings
   - Optimize for specific timeframes (13min, 15min, 4h recommended)
   - Tune parameters for each trading pair
4. **Set up Alerts** using the built-in alert conditions
5. **Backtest** using different parameter combinations

## Recommended Timeframes
- **Primary**: 15-minute and 4-hour charts
- **Alternative**: 13-minute and 30-minute
- **Optimization**: Test different settings for each timeframe and trading pair

## Risk Management
- Use the 6-tier take profit system for partial exits
- Maintain the 4.5% stop loss (adjustable)
- Consider position sizing based on volatility
- Never risk more than 2-3% of capital per trade

This implementation provides the core logic of the Infinity Algo indicator while remaining fully transparent and customizable for different market conditions and trading preferences.