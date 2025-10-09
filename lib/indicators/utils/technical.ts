// Technical indicator utilities

export function sma(arr: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null)
  let sum = 0
  let count = 0
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v == null) {
      out[i] = null
      continue
    }
    sum += v
    count++

    // Remove oldest value if we exceed the period
    if (i >= period) {
      const oldVal = arr[i - period]
      if (oldVal != null) {
        sum -= oldVal
        count--
      }
    }

    // Only calculate SMA when we have enough valid values
    out[i] = count >= period ? sum / period : null
  }
  return out
}

export function ema(arr: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null)
  const k = 2 / (period + 1)
  let prev: number | null = null
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v == null) {
      out[i] = prev
      continue
    }
    if (prev == null) prev = v
    else prev = (v as number) * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

export function rma(arr: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null)
  let prev: number | null = null
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v == null) {
      out[i] = prev
      continue
    }
    if (i === period - 1) {
      let sum = 0
      for (let j = 0; j < period; j++) sum += (arr[j] ?? 0) as number
      prev = sum / period
      out[i] = prev
    } else if (i >= period) {
      prev = ((prev as number) * (period - 1) + (v as number)) / period
      out[i] = prev
    }
  }
  return out
}

export function rsi(arr: (number | null)[], period: number = 14): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null)
  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i < arr.length; i++) {
    // Skip if current or previous value is null
    if (arr[i] == null || arr[i - 1] == null) {
      out[i] = null
      continue
    }

    const change = (arr[i] as number) - (arr[i - 1] as number)
    const gain = Math.max(change, 0)
    const loss = Math.max(-change, 0)

    if (i < period) {
      // Accumulate gains and losses for initial period
      avgGain += gain
      avgLoss += loss
    } else if (i === period) {
      // Calculate first RSI value using simple average
      avgGain = (avgGain + gain) / period
      avgLoss = (avgLoss + loss) / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      out[i] = 100 - 100 / (1 + rs)
    } else {
      // Use Wilder's smoothing method for subsequent values
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      out[i] = 100 - 100 / (1 + rs)
    }
  }
  return out
}

export function calculateRSI(arr: (number | null)[], period: number = 14): (number | null)[] {
  return rsi(arr, period)
}

export function calculateMACD(
  closes: (number | null)[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEMA = ema(closes, fastPeriod)
  const slowEMA = ema(closes, slowPeriod)

  const macd: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] == null || slowEMA[i] == null) {
      macd.push(null)
    } else {
      macd.push((fastEMA[i] as number) - (slowEMA[i] as number))
    }
  }

  const signal = ema(macd, signalPeriod)
  const histogram: (number | null)[] = []
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] == null || signal[i] == null) {
      histogram.push(null)
    } else {
      histogram.push((macd[i] as number) - (signal[i] as number))
    }
  }

  return { macd, signal, histogram }
}

export function calculateBollingerBands(
  closes: (number | null)[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(closes, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || middle[i] == null) {
      upper.push(null)
      lower.push(null)
      continue
    }

    // Calculate standard deviation with proper null handling
    let sum = 0
    let count = 0
    for (let j = i - period + 1; j <= i; j++) {
      const val = closes[j]
      if (val != null) {
        sum += Math.pow((val as number) - (middle[i] as number), 2)
        count++
      }
    }

    // Only calculate if we have enough valid values
    if (count >= period) {
      const stdDev = Math.sqrt(sum / count)
      upper.push((middle[i] as number) + stdDevMultiplier * stdDev)
      lower.push((middle[i] as number) - stdDevMultiplier * stdDev)
    } else {
      upper.push(null)
      lower.push(null)
    }
  }

  return { upper, middle, lower }
}

export function calculateSupertrend(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 10,
  multiplier: number = 3
): { supertrend: (number | null)[]; direction: number[] } {
  const n = closes.length
  const supertrend: (number | null)[] = Array(n).fill(null)
  const direction: number[] = Array(n).fill(0) // 1 = bullish, -1 = bearish

  // Calculate ATR
  const tr: (number | null)[] = Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      tr[i] = highs[i] - lows[i]
    } else {
      const hl = highs[i] - lows[i]
      const hc = Math.abs(highs[i] - closes[i - 1])
      const lc = Math.abs(lows[i] - closes[i - 1])
      tr[i] = Math.max(hl, hc, lc)
    }
  }
  const atr = rma(tr, period)

  // Calculate Supertrend
  const basicUpperBand: (number | null)[] = []
  const basicLowerBand: (number | null)[] = []

  for (let i = 0; i < n; i++) {
    const hl2 = (highs[i] + lows[i]) / 2
    if (atr[i] != null) {
      basicUpperBand.push(hl2 + multiplier * (atr[i] as number))
      basicLowerBand.push(hl2 - multiplier * (atr[i] as number))
    } else {
      basicUpperBand.push(null)
      basicLowerBand.push(null)
    }
  }

  let finalUpperBand: number | null = null
  let finalLowerBand: number | null = null

  for (let i = 0; i < n; i++) {
    if (basicUpperBand[i] == null || basicLowerBand[i] == null) {
      continue
    }

    // Final bands
    const prevClose = i > 0 ? closes[i - 1] : closes[i]

    if (finalUpperBand == null || (basicUpperBand[i] as number) < finalUpperBand || prevClose > finalUpperBand) {
      finalUpperBand = basicUpperBand[i] as number
    }

    if (finalLowerBand == null || (basicLowerBand[i] as number) > finalLowerBand || prevClose < finalLowerBand) {
      finalLowerBand = basicLowerBand[i] as number
    }

    // Determine direction and supertrend value
    if (supertrend[i - 1] == null) {
      // Initialize
      if (closes[i] <= finalUpperBand) {
        supertrend[i] = finalUpperBand
        direction[i] = -1
      } else {
        supertrend[i] = finalLowerBand
        direction[i] = 1
      }
    } else {
      if (direction[i - 1] === 1) {
        if (closes[i] <= finalLowerBand) {
          supertrend[i] = finalUpperBand
          direction[i] = -1
        } else {
          supertrend[i] = finalLowerBand
          direction[i] = 1
        }
      } else {
        if (closes[i] >= finalUpperBand) {
          supertrend[i] = finalLowerBand
          direction[i] = 1
        } else {
          supertrend[i] = finalUpperBand
          direction[i] = -1
        }
      }
    }
  }

  return { supertrend, direction }
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
  useRMA: boolean = true
): (number | null)[] {
  const tr: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      tr.push(highs[i] - lows[i])
    } else {
      const hl = highs[i] - lows[i]
      const hc = Math.abs(highs[i] - closes[i - 1])
      const lc = Math.abs(lows[i] - closes[i - 1])
      tr.push(Math.max(hl, hc, lc))
    }
  }
  return useRMA ? rma(tr, period) : ema(tr, period)
}

export function isVolumeSpike(
  volumes: number[],
  threshold: number = 1.5,
  period: number = 20
): boolean[] {
  const volumeMA = sma(volumes, period)
  const result: boolean[] = []

  for (let i = 0; i < volumes.length; i++) {
    if (volumeMA[i] == null) {
      result.push(false)
    } else {
      result.push(volumes[i] > (volumeMA[i] as number) * threshold)
    }
  }

  return result
}
