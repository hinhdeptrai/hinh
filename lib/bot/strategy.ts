import { Signal } from './types'

export interface StrategyResult {
  side: 'buy' | 'sell' | null
  entry: number
  sl: number
  tp: number
  confidence: number
  reason: string
}

export interface KlineData {
  t: number[]
  o: number[]
  h: number[]
  l: number[]
  c: number[]
  v: number[]
}

export class BreakoutStrategy {
  name = 'breakout-atr'

  async analyze(symbol: string, timeframe: string, klines: KlineData): Promise<StrategyResult> {
    console.log(`[Strategy] Analyzing ${symbol} with ${klines.c.length} candles`)
    
    if (klines.c.length < 20) {
      console.log(`[Strategy] ${symbol}: Insufficient data (<20 candles)`)
      return {
        side: null,
        entry: 0,
        sl: 0,
        tp: 0,
        confidence: 0,
        reason: 'Insufficient data (<20 candles)'
      }
    }

    // Convert to array format
    const candles = klines.c.map((close, i) => ({
      open: klines.o[i],
      high: klines.h[i],
      low: klines.l[i],
      close: close,
      volume: klines.v[i],
      timestamp: klines.t[i]
    }))

    const recent = candles.slice(-20)
    const current = recent[recent.length - 1]
    const previous = recent.slice(0, -1)

    // Calculate ATR
    const atr = this.calculateATR(recent, 14)
    
    // Check volatility
    const volatilityPercentile = this.getVolatilityPercentile(recent, atr)
    console.log(`[Strategy] ${symbol}: ATR=${atr.toFixed(4)}, Volatility=${(volatilityPercentile*100).toFixed(1)}%`)
    
    if (volatilityPercentile < 0.5) {
      console.log(`[Strategy] ${symbol}: Low volatility (<50th percentile)`)
      return {
        side: null,
        entry: 0,
        sl: 0,
        tp: 0,
        confidence: 0,
        reason: 'Low volatility (<50th percentile)'
      }
    }

    // Find breakout
    const highestHigh = Math.max(...previous.map(k => k.high))
    const lowestLow = Math.min(...previous.map(k => k.low))

    const breakoutUp = current.close > highestHigh
    const breakoutDown = current.close < lowestLow

    console.log(`[Strategy] ${symbol}: HH=${highestHigh.toFixed(2)}, LL=${lowestLow.toFixed(2)}, C=${current.close.toFixed(2)}`)
    console.log(`[Strategy] ${symbol}: Breakout UP=${breakoutUp}, DOWN=${breakoutDown}`)

    if (!breakoutUp && !breakoutDown) {
      console.log(`[Strategy] ${symbol}: No breakout detected`)
      return {
        side: null,
        entry: 0,
        sl: 0,
        tp: 0,
        confidence: 0,
        reason: `No breakout (HH=${highestHigh.toFixed(2)}, LL=${lowestLow.toFixed(2)}, C=${current.close.toFixed(2)})`
      }
    }

    if (breakoutUp) {
      const entry = current.close
      const sl = entry - (2 * atr)
      const tp = entry + (2.4 * atr)
      const minTp = entry * 1.001

      return {
        side: 'buy',
        entry,
        sl,
        tp: Math.max(tp, minTp),
        confidence: Math.min(volatilityPercentile * 1.2, 1),
        reason: `Breakout UP (ATR=${atr.toFixed(2)})`
      }
    } else {
      const entry = current.close
      const sl = entry + (2 * atr)
      const tp = entry - (2.4 * atr)
      const minTp = entry * 0.999

      return {
        side: 'sell',
        entry,
        sl,
        tp: Math.min(tp, minTp),
        confidence: Math.min(volatilityPercentile * 1.2, 1),
        reason: `Breakout DOWN (ATR=${atr.toFixed(2)})`
      }
    }
  }

  private calculateATR(candles: any[], period: number): number {
    if (candles.length < period + 1) return 0
    
    const tr: number[] = []
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i]
      const p = candles[i - 1]
      tr.push(Math.max(
        c.high - c.low,
        Math.abs(c.high - p.close),
        Math.abs(c.low - p.close)
      ))
    }
    
    return tr.slice(-period).reduce((a, b) => a + b, 0) / period
  }

  private getVolatilityPercentile(candles: any[], currentATR: number): number {
    if (candles.length < 20) return 0
    
    const atrs: number[] = []
    for (let i = 14; i < candles.length; i++) {
      const window = candles.slice(i - 14, i)
      atrs.push(this.calculateATR(window, 14))
    }
    
    atrs.sort((a, b) => a - b)
    const index = atrs.findIndex(v => v >= currentATR)
    if (index === -1) return 1
    
    return 1 - index / atrs.length
  }
}
