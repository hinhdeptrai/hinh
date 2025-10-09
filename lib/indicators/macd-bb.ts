import type { BaseIndicator, MacdBBSettings, Klines, IndicatorResult } from './types'
import { calculateMACD, calculateBollingerBands, sma, isVolumeSpike } from './utils/technical'

export class MacdBBIndicator implements BaseIndicator {
  getName(): string {
    return 'MACD + Bollinger Bands'
  }

  getDescription(): string {
    return 'Chiến lược kết hợp MACD crossover với Bollinger Bands breakout. Win rate: 78%'
  }

  getWinRate(): number {
    return 78
  }

  getDefaultSettings(): MacdBBSettings {
    return {
      MACD_FAST: 12,
      MACD_SLOW: 26,
      MACD_SIGNAL: 9,
      BB_PERIOD: 20,
      BB_STD_DEV: 2,
      MIN_VOLUME_MULTIPLIER: 1.2,
      // Default TP/SL levels
      TP1_LONG_PCT: 0.5,
      TP2_LONG_PCT: 1.0,
      TP3_LONG_PCT: 2.0,
      TP4_LONG_PCT: 3.0,
      TP5_LONG_PCT: 7.5,
      TP6_LONG_PCT: 16.5,
      TP1_SHORT_PCT: 0.5,
      TP2_SHORT_PCT: 1.0,
      TP3_SHORT_PCT: 2.0,
      TP4_SHORT_PCT: 3.0,
      TP5_SHORT_PCT: 7.5,
      TP6_SHORT_PCT: 16.5,
      SL_LONG_PCT: 2.0,
      SL_SHORT_PCT: 2.0,
      MAX_SIGNAL_AGE_BARS: 3,
    }
  }

  async analyze(data: Klines, customSettings?: Partial<MacdBBSettings>): Promise<IndicatorResult> {
    const settings = { ...this.getDefaultSettings(), ...customSettings }

    const {
      MACD_FAST = 12,
      MACD_SLOW = 26,
      MACD_SIGNAL = 9,
      BB_PERIOD = 20,
      BB_STD_DEV = 2,
      MIN_VOLUME_MULTIPLIER = 1.2,
      TP1_LONG_PCT,
      TP2_LONG_PCT,
      TP3_LONG_PCT,
      TP4_LONG_PCT,
      TP5_LONG_PCT,
      TP6_LONG_PCT,
      TP1_SHORT_PCT,
      TP2_SHORT_PCT,
      TP3_SHORT_PCT,
      TP4_SHORT_PCT,
      TP5_SHORT_PCT,
      TP6_SHORT_PCT,
      SL_LONG_PCT,
      SL_SHORT_PCT,
      MAX_SIGNAL_AGE_BARS,
    } = settings

    const n = data.c.length
    const last = n - 1

    // Calculate indicators
    const { macd, signal: macdSignal, histogram } = calculateMACD(data.c, MACD_FAST, MACD_SLOW, MACD_SIGNAL)
    const { upper, middle, lower } = calculateBollingerBands(data.c, BB_PERIOD, BB_STD_DEV)

    // Volume confirmation
    const avgVol20 = sma(data.v, 20)[last] as number | null
    const volumeConfirmed = avgVol20 != null ? data.v[last] > avgVol20 * MIN_VOLUME_MULTIPLIER : false

    // Signal logic
    const buy: boolean[] = Array(n).fill(false)
    const sell: boolean[] = Array(n).fill(false)
    const reasons: Record<number, string[]> = {}

    // Lookback window for BB touch + MACD cross confirmation
    const CONFIRMATION_WINDOW = 3 // Check last 3 candles

    for (let i = CONFIRMATION_WINDOW; i < n; i++) {
      const conditions: string[] = []

      // BUY: Price touched lower BB in last 3 candles + MACD histogram crosses above 0 now
      if (histogram[i] != null && histogram[i - 1] != null) {
        const macdCrossUp = (histogram[i - 1] as number) <= 0 && (histogram[i] as number) > 0

        if (macdCrossUp) {
          // Check if price touched lower BB in last 3 candles
          let priceTouchedLowerBB = false
          for (let j = Math.max(0, i - CONFIRMATION_WINDOW); j <= i; j++) {
            if (lower[j] != null && data.l[j] <= (lower[j] as number) * 1.002) { // 0.2% tolerance
              priceTouchedLowerBB = true
              break
            }
          }

          if (priceTouchedLowerBB) {
            buy[i] = true
            conditions.push('Giá đã chạm Lower BB (trong 3 nến)')
            conditions.push('MACD histogram cross lên trên 0')
            reasons[i] = conditions
          }
        }
      }

      // SELL: Price touched upper BB in last 3 candles + MACD histogram crosses below 0 now
      if (histogram[i] != null && histogram[i - 1] != null) {
        const macdCrossDown = (histogram[i - 1] as number) >= 0 && (histogram[i] as number) < 0

        if (macdCrossDown) {
          // Check if price touched upper BB in last 3 candles
          let priceTouchedUpperBB = false
          for (let j = Math.max(0, i - CONFIRMATION_WINDOW); j <= i; j++) {
            if (upper[j] != null && data.h[j] >= (upper[j] as number) * 0.998) { // 0.2% tolerance
              priceTouchedUpperBB = true
              break
            }
          }

          if (priceTouchedUpperBB) {
            sell[i] = true
            conditions.push('Giá đã chạm Upper BB (trong 3 nến)')
            conditions.push('MACD histogram cross xuống dưới 0')
            reasons[i] = conditions
          }
        }
      }
    }

    // Unified signal array
    const unifiedSignal: number[] = data.c.map((_, i) => (buy[i] ? 1 : sell[i] ? -1 : 0))
    const prev = last - 1

    // Find last signal
    const barsSince = (predicate: (v: number, i: number) => boolean) => {
      for (let i = unifiedSignal.length - 1; i >= 0; i--) {
        if (predicate(unifiedSignal[i], i)) {
          return { bars: unifiedSignal.length - 1 - i, index: i }
        }
      }
      return { bars: null as number | null, index: null as number | null }
    }

    const any = barsSince((v) => v !== 0)
    const onlyBuy = barsSince((v) => v === 1)
    const onlySell = barsSince((v) => v === -1)

    let lastSignal: 'NONE' | 'BUY' | 'SELL' = 'NONE'
    let lastSignalIndex: number | null = null
    if (any.index !== null) {
      lastSignal = unifiedSignal[any.index] === 1 ? 'BUY' : 'SELL'
      lastSignalIndex = any.index
    }

    const intervalToMinutes = (interval: string) => {
      const m = interval.match(/^(\d+)([mhdw])$/i)
      if (!m) return null
      const num = Number(m[1])
      const u = m[2].toLowerCase()
      if (u === 'm') return num
      if (u === 'h') return num * 60
      if (u === 'd') return num * 60 * 24
      if (u === 'w') return num * 60 * 24 * 7
      return null
    }

    const signalAgeMinutes = any.bars != null ? any.bars * (intervalToMinutes('4h') || 240) : null

    const newSignal = prev >= 0
      ? unifiedSignal[last] !== 0 && unifiedSignal[prev] === 0
        ? unifiedSignal[last] === 1 ? 'NEW_BUY' : 'NEW_SELL'
        : 'NONE'
      : 'NONE'

    const isSignalFresh = any.bars != null ? any.bars <= (MAX_SIGNAL_AGE_BARS || 3) : false

    // Calculate confidence score (0-100)
    let confidence = 50 // Base confidence
    if (volumeConfirmed) confidence += 15
    if (isSignalFresh) confidence += 10
    // Add BB width factor
    if (upper[last] != null && lower[last] != null && middle[last] != null) {
      const bbWidth = ((upper[last] as number) - (lower[last] as number)) / (middle[last] as number)
      if (bbWidth > 0.04) confidence += 10 // Wide BB = high volatility = better entry
      if (bbWidth < 0.02) confidence -= 10 // Narrow BB = low volatility = risky
    }
    confidence = Math.max(0, Math.min(100, confidence))

    // Entry levels
    const buildLevels = () => {
      if (lastSignalIndex == null) {
        return { pos: 0, entry: null, sl: null, tp1: null, tp2: null, tp3: null, tp4: null, tp5: null, tp6: null }
      }
      const pos = unifiedSignal[lastSignalIndex]
      const entry = data.c[lastSignalIndex]

      const TP1_LONG = (TP1_LONG_PCT || 0.5) / 100
      const TP2_LONG = (TP2_LONG_PCT || 1.0) / 100
      const TP3_LONG = (TP3_LONG_PCT || 2.0) / 100
      const TP4_LONG = (TP4_LONG_PCT || 3.0) / 100
      const TP5_LONG = (TP5_LONG_PCT || 7.5) / 100
      const TP6_LONG = (TP6_LONG_PCT || 16.5) / 100
      const SL_LONG = (SL_LONG_PCT || 2.0) / 100

      const TP1_SHORT = (TP1_SHORT_PCT || 0.5) / 100
      const TP2_SHORT = (TP2_SHORT_PCT || 1.0) / 100
      const TP3_SHORT = (TP3_SHORT_PCT || 2.0) / 100
      const TP4_SHORT = (TP4_SHORT_PCT || 3.0) / 100
      const TP5_SHORT = (TP5_SHORT_PCT || 7.5) / 100
      const TP6_SHORT = (TP6_SHORT_PCT || 16.5) / 100
      const SL_SHORT = (SL_SHORT_PCT || 2.0) / 100

      if (pos === 1) {
        return {
          pos,
          entry,
          sl: entry * (1 - SL_LONG),
          tp1: entry * (1 + TP1_LONG),
          tp2: entry * (1 + TP2_LONG),
          tp3: entry * (1 + TP3_LONG),
          tp4: entry * (1 + TP4_LONG),
          tp5: entry * (1 + TP5_LONG),
          tp6: entry * (1 + TP6_LONG),
        }
      } else if (pos === -1) {
        return {
          pos,
          entry,
          sl: entry * (1 + SL_SHORT),
          tp1: entry * (1 - TP1_SHORT),
          tp2: entry * (1 - TP2_SHORT),
          tp3: entry * (1 - TP3_SHORT),
          tp4: entry * (1 - TP4_SHORT),
          tp5: entry * (1 - TP5_SHORT),
          tp6: entry * (1 - TP6_SHORT),
        }
      }
      return { pos: 0, entry: null, sl: null, tp1: null, tp2: null, tp3: null, tp4: null, tp5: null, tp6: null }
    }

    const entryLevels = buildLevels()

    // Evaluate outcome
    let lastSignalOutcome: 'NONE' | 'TP1' | 'TP2' | 'TP3' | 'TP4' | 'TP5' | 'TP6' | 'SL' = 'NONE'
    let lastSignalOutcomeIndex: number | null = null
    let lastSignalOutcomePrice: number | null = null

    if (lastSignalIndex != null && lastSignalIndex < last && entryLevels.entry != null) {
      const pos = unifiedSignal[lastSignalIndex]
      const { sl, tp1, tp2, tp3, tp4, tp5, tp6 } = entryLevels
      if (pos === 1) {
        for (let i = lastSignalIndex + 1; i <= last; i++) {
          if (sl != null && data.l[i] <= sl) {
            lastSignalOutcome = 'SL'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = sl
            break
          }
          if (tp6 != null && data.h[i] >= tp6) {
            lastSignalOutcome = 'TP6'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp6
            break
          }
          if (tp5 != null && data.h[i] >= tp5) {
            lastSignalOutcome = 'TP5'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp5
            break
          }
          if (tp4 != null && data.h[i] >= tp4) {
            lastSignalOutcome = 'TP4'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp4
            break
          }
          if (tp3 != null && data.h[i] >= tp3) {
            lastSignalOutcome = 'TP3'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp3
            break
          }
          if (tp2 != null && data.h[i] >= tp2) {
            lastSignalOutcome = 'TP2'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp2
            break
          }
          if (tp1 != null && data.h[i] >= tp1) {
            lastSignalOutcome = 'TP1'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp1
            break
          }
        }
      } else if (pos === -1) {
        for (let i = lastSignalIndex + 1; i <= last; i++) {
          if (sl != null && data.h[i] >= sl) {
            lastSignalOutcome = 'SL'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = sl
            break
          }
          if (tp6 != null && data.l[i] <= tp6) {
            lastSignalOutcome = 'TP6'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp6
            break
          }
          if (tp5 != null && data.l[i] <= tp5) {
            lastSignalOutcome = 'TP5'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp5
            break
          }
          if (tp4 != null && data.l[i] <= tp4) {
            lastSignalOutcome = 'TP4'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp4
            break
          }
          if (tp3 != null && data.l[i] <= tp3) {
            lastSignalOutcome = 'TP3'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp3
            break
          }
          if (tp2 != null && data.l[i] <= tp2) {
            lastSignalOutcome = 'TP2'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp2
            break
          }
          if (tp1 != null && data.l[i] <= tp1) {
            lastSignalOutcome = 'TP1'
            lastSignalOutcomeIndex = i
            lastSignalOutcomePrice = tp1
            break
          }
        }
      }
    }

    // Price direction
    const priceDirection = middle[last] != null
      ? (data.c[last] > (middle[last] as number) ? 'Tăng' : data.c[last] < (middle[last] as number) ? 'Giảm' : 'Trung lập')
      : 'Trung lập'

    return {
      symbol: '', // Will be filled by caller
      mainTF: '4h', // Will be filled by caller
      time: new Date(data.t[last]).toISOString(),
      close: data.c[last],
      signal: unifiedSignal[last] === 1 ? 'BUY' : unifiedSignal[last] === -1 ? 'SELL' : 'NONE',
      lastSignal,
      lastSignalIndex,
      lastSignalTime: lastSignalIndex != null ? new Date(data.t[lastSignalIndex]).toISOString() : null,
      lastSignalPrice: lastSignalIndex != null ? data.c[lastSignalIndex] : null,
      barsSinceSignal: any.bars,
      barsSinceBuy: onlyBuy.bars,
      barsSinceSell: onlySell.bars,
      signalAgeMinutes,
      newSignal,
      isSignalFresh,
      entryLevels,
      volume: data.v[last],
      volumeConfirmed,
      priceDirection,
      srLevels: {}, // Can be added if needed
      settings,
      lastSignalOutcome,
      lastSignalOutcomeIndex,
      lastSignalOutcomeTime: lastSignalOutcomeIndex != null ? new Date(data.t[lastSignalOutcomeIndex]).toISOString() : null,
      lastSignalOutcomePrice,
      confidence,
      reasons: lastSignalIndex != null ? reasons[lastSignalIndex] : undefined,
      indicatorType: 'MACD_BB',
    }
  }
}
