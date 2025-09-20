export type Klines = {
  t: number[]
  o: number[]
  h: number[]
  l: number[]
  c: number[]
  v: number[]
}

const toNum = (x: any) => (x == null ? null : Number(x))

const sma = (arr: (number | null)[], p: number) => {
  const out: (number | null)[] = Array(arr.length).fill(null)
  let sum = 0
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v == null) {
      out[i] = null
      continue
    }
    sum += v
    if (i >= p) sum -= (arr[i - p] as number)
    out[i] = i >= p - 1 ? sum / p : null
  }
  return out
}

const ema = (arr: (number | null)[], p: number) => {
  const out: (number | null)[] = Array(arr.length).fill(null)
  const k = 2 / (p + 1)
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

const rma = (arr: (number | null)[], p: number) => {
  const out: (number | null)[] = Array(arr.length).fill(null)
  let prev: number | null = null
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v == null) {
      out[i] = prev
      continue
    }
    if (i === p - 1) {
      let sum = 0
      for (let j = 0; j < p; j++) sum += (arr[j] ?? 0) as number
      prev = sum / p
      out[i] = prev
    } else if (i >= p) {
      prev = ((prev as number) * (p - 1) + (v as number)) / p
      out[i] = prev
    }
  }
  return out
}

const rsi = (arr: (number | null)[], p: number) => {
  const out: (number | null)[] = Array(arr.length).fill(null)
  let avgGain = 0,
    avgLoss = 0
  for (let i = 1; i < arr.length; i++) {
    const change = (arr[i] ?? 0) - (arr[i - 1] ?? 0)
    const gain = Math.max(change as number, 0)
    const loss = Math.max(-(change as number), 0)
    if (i <= p) {
      avgGain += gain
      avgLoss += loss
      if (i === p) {
        avgGain /= p
        avgLoss /= p
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        out[i] = 100 - 100 / (1 + (rs as number))
      }
    } else {
      avgGain = (avgGain * (p - 1) + gain) / p
      avgLoss = (avgLoss * (p - 1) + loss) / p
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      out[i] = 100 - 100 / (1 + (rs as number))
    }
  }
  return out
}

const trueRangeSeries = (high: number[], low: number[], close: number[]) => {
  const n = high.length
  const tr: (number | null)[] = Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    if (i === 0) tr[i] = high[i] - low[i]
    else {
      const hl = high[i] - low[i]
      const hc = Math.abs(high[i] - close[i - 1])
      const lc = Math.abs(low[i] - close[i - 1])
      tr[i] = Math.max(hl, hc, lc)
    }
  }
  return tr
}

const atrSeries = (
  high: number[],
  low: number[],
  close: number[],
  p: number,
  useRMA: boolean
) => {
  const tr = trueRangeSeries(high, low, close)
  return useRMA ? rma(tr, p) : ema(tr, p)
}

const obv = (close: number[], volume: number[]) => {
  const out: number[] = Array(close.length).fill(0)
  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) out[i] = out[i - 1] + volume[i]
    else if (close[i] < close[i - 1]) out[i] = out[i - 1] - volume[i]
    else out[i] = out[i - 1]
  }
  return out
}

const dmiAdx = (high: number[], low: number[], close: number[], p: number, useRMA: boolean) => {
  const n = high.length
  const plusDM: number[] = Array(n).fill(0)
  const minusDM: number[] = Array(n).fill(0)
  const TR = trueRangeSeries(high, low, close)

  for (let i = 1; i < n; i++) {
    const up = high[i] - high[i - 1]
    const dn = low[i - 1] - low[i]
    plusDM[i] = up > dn && up > 0 ? up : 0
    minusDM[i] = dn > up && dn > 0 ? dn : 0
  }
  const smoothTR = useRMA ? rma(TR, p) : ema(TR, p)
  const smoothPlusDM = useRMA ? rma(plusDM, p) : ema(plusDM, p)
  const smoothMinusDM = useRMA ? rma(minusDM, p) : ema(minusDM, p)

  const plusDI: (number | null)[] = Array(n).fill(null)
  const minusDI: (number | null)[] = Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    if (!smoothTR[i] || smoothTR[i] === 0) continue
    plusDI[i] = 100 * ((smoothPlusDM[i] as number) / (smoothTR[i] as number))
    minusDI[i] = 100 * ((smoothMinusDM[i] as number) / (smoothTR[i] as number))
  }
  const dx: (number | null)[] = Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    if (plusDI[i] == null || minusDI[i] == null) continue
    const den = (plusDI[i] as number) + (minusDI[i] as number)
    dx[i] = den === 0 ? 0 : 100 * (Math.abs((plusDI[i] as number) - (minusDI[i] as number)) / den)
  }
  const adx = useRMA ? rma(dx, p) : ema(dx, p)
  return { plusDI, minusDI, adx }
}

const heikinAshi = (o: number[], h: number[], l: number[], c: number[]) => {
  const n = o.length
  const haO: (number | null)[] = Array(n).fill(null)
  const haH: (number | null)[] = Array(n).fill(null)
  const haL: (number | null)[] = Array(n).fill(null)
  const haC: (number | null)[] = Array(n).fill(null)

  for (let i = 0; i < n; i++) {
    haC[i] = (o[i] + h[i] + l[i] + c[i]) / 4
    if (i === 0) haO[i] = (o[i] + c[i]) / 2
    else haO[i] = (((haO[i - 1] as number) + (haC[i - 1] as number)) / 2)
    haH[i] = Math.max(h[i], haO[i] as number, haC[i] as number)
    haL[i] = Math.min(l[i], haO[i] as number, haC[i] as number)
  }
  return { haO, haH, haL, haC }
}

const pivotHigh = (high: number[], left: number, right: number) => {
  const n = high.length
  const out: (number | null)[] = Array(n).fill(null)
  for (let i = left; i < n - right; i++) {
    let isPivot = true
    for (let j = 1; j <= left; j++) if (high[i] <= high[i - j]) { isPivot = false; break }
    if (!isPivot) continue
    for (let j = 1; j <= right; j++) if (high[i] <= high[i + j]) { isPivot = false; break }
    if (isPivot) out[i] = high[i]
  }
  return out
}

const pivotLow = (low: number[], left: number, right: number) => {
  const n = low.length
  const out: (number | null)[] = Array(n).fill(null)
  for (let i = left; i < n - right; i++) {
    let isPivot = true
    for (let j = 1; j <= left; j++) if (low[i] >= low[i - j]) { isPivot = false; break }
    if (!isPivot) continue
    for (let j = 1; j <= right; j++) if (low[i] >= low[i + j]) { isPivot = false; break }
    if (isPivot) out[i] = low[i]
  }
  return out
}

export async function fetchKlines(symbol: string, interval: string, limit = 500): Promise<Klines> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Binance error ${res.status} ${res.statusText}`)
  const data = await res.json()
  const o = data.map((k: any[]) => toNum(k[1]) as number)
  const h = data.map((k: any[]) => toNum(k[2]) as number)
  const l = data.map((k: any[]) => toNum(k[3]) as number)
  const c = data.map((k: any[]) => toNum(k[4]) as number)
  const v = data.map((k: any[]) => toNum(k[5]) as number)
  const t = data.map((k: any[]) => Number(k[0]))
  return { t, o, h, l, c, v }
}

// Infinity Algo settings mapped from the provided spec
export type IndicatorSettings = {
  // Pivot & breakout
  PIVOT_PERIOD?: number // 2-20, default 5
  THRESHOLD_RATE_PCT?: number // 3-10%, default 5
  MIN_TESTS?: number // 2-5, default 2
  MAX_LEVELS?: number // cap tracked levels for performance, default 100

  // Moving average filter
  MA_TYPE?: 'EMA' | 'SMA' // default EMA
  MA_LENGTH?: number // default 21
  MA_FILTER?: boolean // default true

  // Heiken Ashi and pattern
  USE_HEIKEN_ASHI?: boolean // default false
  ENABLE_CUP_PATTERN?: boolean // default true

  // Risk management (percent)
  TP1_LONG_PCT?: number // default 0.3
  TP2_LONG_PCT?: number // default 1.0
  TP3_LONG_PCT?: number // default 2.0
  TP4_LONG_PCT?: number // default 3.0
  TP5_LONG_PCT?: number // default 7.5
  TP6_LONG_PCT?: number // default 16.5

  TP1_SHORT_PCT?: number // default 0.3
  TP2_SHORT_PCT?: number // default 1.0
  TP3_SHORT_PCT?: number // default 2.0
  TP4_SHORT_PCT?: number // default 3.0
  TP5_SHORT_PCT?: number // default 7.5
  TP6_SHORT_PCT?: number // default 16.5

  SL_LONG_PCT?: number // default 4.5
  SL_SHORT_PCT?: number // default 4.5

  // Misc
  MAX_SIGNAL_AGE_BARS?: number // freshness window, default 3
}

export async function getIndicator({
  symbol,
  intervals = ["4h"],
  limit = 500,
  settings = {},
}: {
  symbol: string
  intervals?: string[]
  limit?: number
  settings?: IndicatorSettings
}) {
  // Defaults from Infinity Algo spec
  const PIVOT_PERIOD = Math.max(2, Math.min(20, settings.PIVOT_PERIOD ?? 5))
  const THRESHOLD_RATE_PCT = Math.max(0.1, settings.THRESHOLD_RATE_PCT ?? 5.0)
  const MIN_TESTS = Math.max(1, Math.min(10, settings.MIN_TESTS ?? 2))
  const MAX_LEVELS = settings.MAX_LEVELS ?? 100

  const MA_TYPE = settings.MA_TYPE ?? 'EMA'
  const MA_LENGTH = settings.MA_LENGTH ?? 21
  const MA_FILTER = settings.MA_FILTER ?? true

  const USE_HA = settings.USE_HEIKEN_ASHI ?? false
  const ENABLE_CUP = settings.ENABLE_CUP_PATTERN ?? true

  const TP1_LONG = (settings.TP1_LONG_PCT ?? 0.3) / 100
  const TP2_LONG = (settings.TP2_LONG_PCT ?? 1.0) / 100
  const TP3_LONG = (settings.TP3_LONG_PCT ?? 2.0) / 100
  const TP4_LONG = (settings.TP4_LONG_PCT ?? 3.0) / 100
  const TP5_LONG = (settings.TP5_LONG_PCT ?? 7.5) / 100
  const TP6_LONG = (settings.TP6_LONG_PCT ?? 16.5) / 100

  const TP1_SHORT = (settings.TP1_SHORT_PCT ?? 0.3) / 100
  const TP2_SHORT = (settings.TP2_SHORT_PCT ?? 1.0) / 100
  const TP3_SHORT = (settings.TP3_SHORT_PCT ?? 2.0) / 100
  const TP4_SHORT = (settings.TP4_SHORT_PCT ?? 3.0) / 100
  const TP5_SHORT = (settings.TP5_SHORT_PCT ?? 7.5) / 100
  const TP6_SHORT = (settings.TP6_SHORT_PCT ?? 16.5) / 100

  const SL_LONG = (settings.SL_LONG_PCT ?? 4.5) / 100
  const SL_SHORT = (settings.SL_SHORT_PCT ?? 4.5) / 100

  const MAX_SIGNAL_AGE_BARS = settings.MAX_SIGNAL_AGE_BARS ?? 3

  // Fetch data for requested intervals
  const dataByTF: Record<string, Klines> = {}
  for (const tf of intervals) dataByTF[tf] = await fetchKlines(symbol, tf, limit)

  const mainTF = intervals[0]
  const main = dataByTF[mainTF]
  const n = main.c.length
  const { haO, haH, haL, haC } = heikinAshi(main.o, main.h, main.l, main.c)

  // Source series depending on HA toggle
  const srcO = USE_HA ? (haO as number[]) : main.o
  const srcH = USE_HA ? (haH as number[]) : main.h
  const srcL = USE_HA ? (haL as number[]) : main.l
  const srcC = USE_HA ? (haC as number[]) : main.c

  // MA Series
  const maSeries = MA_TYPE === 'EMA' ? ema(srcC, MA_LENGTH) : sma(srcC, MA_LENGTH)

  // Precompute pivots
  const ph = pivotHigh(srcH, PIVOT_PERIOD, PIVOT_PERIOD)
  const pl = pivotLow(srcL, PIVOT_PERIOD, PIVOT_PERIOD)

  // Track levels and tests over time
  const resLevels: number[] = []
  const supLevels: number[] = []
  const resTests: number[] = []
  const supTests: number[] = []

  const breakoutUp: boolean[] = Array(n).fill(false)
  const breakoutDown: boolean[] = Array(n).fill(false)
  const maBull: boolean[] = Array(n).fill(false)
  const maBear: boolean[] = Array(n).fill(false)
  const bullishCup: boolean[] = Array(n).fill(false)
  const bearishCup: boolean[] = Array(n).fill(false)

  const thr = (lvl: number) => (lvl * (THRESHOLD_RATE_PCT / 100))

  for (let i = 0; i < n; i++) {
    // add newly formed pivot levels
    if (ph[i] != null) {
      resLevels.push(ph[i] as number)
      resTests.push(1)
      if (resLevels.length > MAX_LEVELS) { resLevels.shift(); resTests.shift() }
    }
    if (pl[i] != null) {
      supLevels.push(pl[i] as number)
      supTests.push(1)
      if (supLevels.length > MAX_LEVELS) { supLevels.shift(); supTests.shift() }
    }

    // count touches at current bar
    for (let j = 0; j < resLevels.length; j++) {
      const lvl = resLevels[j]
      if (Math.abs(srcH[i] - lvl) <= thr(lvl)) resTests[j] = (resTests[j] ?? 0) + 1
    }
    for (let j = 0; j < supLevels.length; j++) {
      const lvl = supLevels[j]
      if (Math.abs(srcL[i] - lvl) <= thr(lvl)) supTests[j] = (supTests[j] ?? 0) + 1
    }

    // breakout conditions (using close cross)
    if (i > 0) {
      // resistance breakout
      let up = false
      for (let j = 0; j < resLevels.length; j++) {
        const lvl = resLevels[j]
        const tests = resTests[j] ?? 0
        if (tests >= MIN_TESTS && srcC[i] > lvl && srcC[i - 1] <= lvl) { up = true; break }
      }
      breakoutUp[i] = up

      // support breakdown
      let dn = false
      for (let j = 0; j < supLevels.length; j++) {
        const lvl = supLevels[j]
        const tests = supTests[j] ?? 0
        if (tests >= MIN_TESTS && srcC[i] < lvl && srcC[i - 1] >= lvl) { dn = true; break }
      }
      breakoutDown[i] = dn
    }

    // MA filter
    maBull[i] = !MA_FILTER || (maSeries[i] != null && srcC[i] > (maSeries[i] as number))
    maBear[i] = !MA_FILTER || (maSeries[i] != null && srcC[i] < (maSeries[i] as number))

    // Cup patterns (simple)
    if (ENABLE_CUP && i >= 10) {
      bullishCup[i] = srcL[i - 10] > srcL[i - 5] && srcL[i - 5] < srcL[i] && srcC[i] > srcC[i - 5] && (maSeries[i] == null || srcC[i] > (maSeries[i] as number))
      bearishCup[i] = srcH[i - 10] < srcH[i - 5] && srcH[i - 5] > srcH[i] && srcC[i] < srcC[i - 5] && (maSeries[i] == null || srcC[i] < (maSeries[i] as number))
    }
  }

  // Final signals
  const buy: boolean[] = Array(n).fill(false)
  const sell: boolean[] = Array(n).fill(false)
  for (let i = 1; i < n; i++) {
    const up = breakoutUp[i] && maBull[i] && (!ENABLE_CUP || bullishCup[i])
    const dn = breakoutDown[i] && maBear[i] && (!ENABLE_CUP || bearishCup[i])
    buy[i] = !!up
    sell[i] = !!dn
  }

  const unifiedSignal: number[] = srcC.map((_, i) => (buy[i] ? 1 : sell[i] ? -1 : 0))
  const last = n - 1
  const prev = last - 1

  const barsSince = (predicate: (v: number, i: number) => boolean) => {
    for (let i = unifiedSignal.length - 1; i >= 0; i--) if (predicate(unifiedSignal[i], i)) return { bars: unifiedSignal.length - 1 - i, index: i }
    return { bars: null as number | null, index: null as number | null }
  }
  const any = barsSince((v) => v !== 0)
  const onlyBuy = barsSince((v) => v === 1)
  const onlySell = barsSince((v) => v === -1)

  let lastSignal: "NONE" | "BUY" | "SELL" = "NONE"
  let lastSignalIndex: number | null = null
  if (any.index !== null) {
    lastSignal = unifiedSignal[any.index] === 1 ? "BUY" : "SELL"
    lastSignalIndex = any.index
  }

  const intervalToMinutes = (interval: string) => {
    const m = interval.match(/^(\d+)([mhdw])$/i)
    if (!m) return null
    const num = Number(m[1])
    const u = m[2].toLowerCase()
    if (u === "m") return num
    if (u === "h") return num * 60
    if (u === "d") return num * 60 * 24
    if (u === "w") return num * 60 * 24 * 7
    return null
  }
  const tfMinutes = intervalToMinutes(mainTF)
  const signalAgeMinutes = any.bars != null && tfMinutes != null ? any.bars * tfMinutes : null

  const newSignal = prev >= 0
    ? unifiedSignal[last] !== 0 && unifiedSignal[prev] === 0
      ? unifiedSignal[last] === 1 ? "NEW_BUY" : "NEW_SELL"
      : "NONE"
    : "NONE"

  const isSignalFresh = any.bars != null ? any.bars <= MAX_SIGNAL_AGE_BARS : false

  // Build entry + 6 TP + SL from last signal
  type EntryLevels = {
    pos: number
    entry: number | null
    sl: number | null
    tp1: number | null
    tp2: number | null
    tp3: number | null
    tp4?: number | null
    tp5?: number | null
    tp6?: number | null
  }
  const buildLevels = (): EntryLevels => {
    if (lastSignalIndex == null) return { pos: 0, entry: null, sl: null, tp1: null, tp2: null, tp3: null, tp4: null, tp5: null, tp6: null }
    const pos = unifiedSignal[lastSignalIndex]
    const entry = srcC[lastSignalIndex]
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

  // SR levels per TF
  const getSRLevelsForTF = (series: { h: number[]; l: number[] }, left = 5, right = 5) => {
    const highs = pivotHigh(series.h, left, right)
    const lows = pivotLow(series.l, left, right)
    const last = series.h.length - 1 - right
    const recentHigh = (() => { for (let i = last; i >= 0; i--) if (highs[i] != null) return highs[i] as number; return null as number | null })()
    const recentLow = (() => { for (let i = last; i >= 0; i--) if (lows[i] != null) return lows[i] as number; return null as number | null })()
    return { recentHigh, recentLow }
  }
  const SR: Record<string, { recentHigh: number | null; recentLow: number | null }> = {}
  for (const tf of intervals) SR[tf] = getSRLevelsForTF({ h: dataByTF[tf].h, l: dataByTF[tf].l }, 5, 5)

  // Basic volume and HA liquidity stats (optional)
  const avgVol20 = sma(main.v, 20)[last] as number | null
  const volumeConfirmed = avgVol20 != null ? main.v[last] > avgVol20 * 1.2 : false
  const liquidity = (haC as number[]).map((x, i) => (haO[i] ? ((x - (haO[i] as number)) / (haO[i] as number)) * 100 : null))

  // Trend description from MA
  const priceDirection = maSeries[last] != null ? (srcC[last] > (maSeries[last] as number) ? 'Tăng' : srcC[last] < (maSeries[last] as number) ? 'Giảm' : 'Trung lập') : 'Trung lập'

  // Evaluate last signal outcome across 6 TPs + SL
  let lastSignalOutcome: "NONE" | "TP1" | "TP2" | "TP3" | "TP4" | "TP5" | "TP6" | "SL" = "NONE"
  let lastSignalOutcomeIndex: number | null = null
  let lastSignalOutcomePrice: number | null = null
  if (lastSignalIndex != null && lastSignalIndex < last && entryLevels.entry != null) {
    const pos = unifiedSignal[lastSignalIndex]
    const { sl, tp1, tp2, tp3, tp4, tp5, tp6 } = entryLevels
    if (pos === 1) {
      for (let i = lastSignalIndex + 1; i <= last; i++) {
        if (sl != null && main.l[i] <= sl) { lastSignalOutcome = 'SL'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = sl; break }
        if (tp6 != null && main.h[i] >= tp6) { lastSignalOutcome = 'TP6'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp6; break }
        if (tp5 != null && main.h[i] >= tp5) { lastSignalOutcome = 'TP5'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp5; break }
        if (tp4 != null && main.h[i] >= tp4) { lastSignalOutcome = 'TP4'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp4; break }
        if (tp3 != null && main.h[i] >= tp3) { lastSignalOutcome = 'TP3'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp3; break }
        if (tp2 != null && main.h[i] >= tp2) { lastSignalOutcome = 'TP2'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp2; break }
        if (tp1 != null && main.h[i] >= tp1) { lastSignalOutcome = 'TP1'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp1; break }
      }
    } else if (pos === -1) {
      for (let i = lastSignalIndex + 1; i <= last; i++) {
        if (sl != null && main.h[i] >= sl) { lastSignalOutcome = 'SL'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = sl; break }
        if (tp6 != null && main.l[i] <= tp6) { lastSignalOutcome = 'TP6'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp6; break }
        if (tp5 != null && main.l[i] <= tp5) { lastSignalOutcome = 'TP5'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp5; break }
        if (tp4 != null && main.l[i] <= tp4) { lastSignalOutcome = 'TP4'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp4; break }
        if (tp3 != null && main.l[i] <= tp3) { lastSignalOutcome = 'TP3'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp3; break }
        if (tp2 != null && main.l[i] <= tp2) { lastSignalOutcome = 'TP2'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp2; break }
        if (tp1 != null && main.l[i] <= tp1) { lastSignalOutcome = 'TP1'; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp1; break }
      }
    }
  }

  return {
    symbol,
    mainTF,
    time: new Date(main.t[last]).toISOString(),
    close: srcC[last],
    priceDirection,
    signal: unifiedSignal[last] === 1 ? "BUY" : unifiedSignal[last] === -1 ? "SELL" : "NONE",
    lastSignal,
    lastSignalIndex,
    lastSignalTime: lastSignalIndex != null ? new Date(main.t[lastSignalIndex]).toISOString() : null,
    lastSignalPrice: lastSignalIndex != null ? srcC[lastSignalIndex] : null,
    barsSinceSignal: any.bars,
    barsSinceBuy: onlyBuy.bars,
    barsSinceSell: onlySell.bars,
    signalAgeMinutes,
    newSignal,
    isSignalFresh,
    entryLevels,
    volume: main.v[last],
    volumeConfirmed,
    srLevels: SR,
    settings: {
      PIVOT_PERIOD,
      THRESHOLD_RATE_PCT,
      MIN_TESTS,
      MAX_LEVELS,
      MA_TYPE,
      MA_LENGTH,
      MA_FILTER,
      USE_HEIKEN_ASHI: USE_HA,
      ENABLE_CUP_PATTERN: ENABLE_CUP,
      TP1_LONG_PCT: TP1_LONG * 100,
      TP2_LONG_PCT: TP2_LONG * 100,
      TP3_LONG_PCT: TP3_LONG * 100,
      TP4_LONG_PCT: TP4_LONG * 100,
      TP5_LONG_PCT: TP5_LONG * 100,
      TP6_LONG_PCT: TP6_LONG * 100,
      TP1_SHORT_PCT: TP1_SHORT * 100,
      TP2_SHORT_PCT: TP2_SHORT * 100,
      TP3_SHORT_PCT: TP3_SHORT * 100,
      TP4_SHORT_PCT: TP4_SHORT * 100,
      TP5_SHORT_PCT: TP5_SHORT * 100,
      TP6_SHORT_PCT: TP6_SHORT * 100,
      SL_LONG_PCT: SL_LONG * 100,
      SL_SHORT_PCT: SL_SHORT * 100,
      MAX_SIGNAL_AGE_BARS,
    },
    lastSignalOutcome,
    lastSignalOutcomeIndex,
    lastSignalOutcomeTime: lastSignalOutcomeIndex != null ? new Date(main.t[lastSignalOutcomeIndex]).toISOString() : null,
    lastSignalOutcomePrice,
  }
}
