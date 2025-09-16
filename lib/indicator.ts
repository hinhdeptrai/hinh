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
  const res = await fetch(url, { next: { revalidate: 30 } })
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

export type IndicatorSettings = {
  ATR_PERIOD?: number
  ATR_MULT?: number
  EMA_PERIOD?: number
  MAX_SIGNAL_AGE_BARS?: number
  USE_RMA_ATR?: boolean
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
  const ATR_PERIOD = settings.ATR_PERIOD ?? 14
  const ATR_MULT = settings.ATR_MULT ?? 1.3
  const EMA_PERIOD = settings.EMA_PERIOD ?? 9
  const MAX_SIGNAL_AGE_BARS = settings.MAX_SIGNAL_AGE_BARS ?? 3
  const USE_RMA_ATR = settings.USE_RMA_ATR ?? true

  const dataByTF: Record<string, Klines> = {}
  for (const tf of intervals) dataByTF[tf] = await fetchKlines(symbol, tf, limit)

  const mainTF = intervals[0]
  const main = dataByTF[mainTF]

  const n = main.c.length
  const { haO, haH, haL, haC } = heikinAshi(main.o, main.h, main.l, main.c)

  const atrArr = atrSeries(main.h, main.l, main.c, ATR_PERIOD, USE_RMA_ATR)
  const upperBand = haC.map((x, i) => (x as number) - ATR_MULT * ((atrArr[i] as number) ?? 0))
  const lowerBand = haC.map((x, i) => (x as number) + ATR_MULT * ((atrArr[i] as number) ?? 0))

  const trendUp: (number | null)[] = Array(n).fill(null)
  const trendDown: (number | null)[] = Array(n).fill(null)
  const trendDir: (1 | -1 | null)[] = Array(n).fill(null)

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      trendUp[i] = upperBand[i]
      trendDown[i] = lowerBand[i]
      trendDir[i] = 1
      continue
    }
    trendUp[i] = (haC[i - 1] as number) > (trendUp[i - 1] as number)
      ? Math.max(upperBand[i] as number, trendUp[i - 1] as number)
      : (upperBand[i] as number)

    trendDown[i] = (haC[i - 1] as number) < (trendDown[i - 1] as number)
      ? Math.min(lowerBand[i] as number, trendDown[i - 1] as number)
      : (lowerBand[i] as number)

    let dir = (trendDir[i - 1] ?? 1) as 1 | -1
    if (dir === -1 && (haC[i] as number) > (trendDown[i - 1] as number)) dir = 1
    else if (dir === 1 && (haC[i] as number) < (trendUp[i - 1] as number)) dir = -1
    trendDir[i] = dir
  }

  const emaArr = ema(main.c, EMA_PERIOD)

  const buy: boolean[] = Array(n).fill(false)
  const sell: boolean[] = Array(n).fill(false)
  for (let i = 1; i < n; i++) {
    buy[i] = trendDir[i] === 1 && trendDir[i - 1] === -1 && main.c[i] > ((emaArr[i] as number) ?? main.c[i])
    sell[i] = trendDir[i] === -1 && trendDir[i - 1] === 1 && main.c[i] < ((emaArr[i] as number) ?? main.c[i])
  }

  const rsi2 = rsi(main.c, 2)
  const rsi2Sma7 = sma(rsi2, 7)
  const { adx } = dmiAdx(main.h, main.l, main.c, 14, USE_RMA_ATR)

  const obvArr = obv(main.c, main.v)
  const obvEma20 = ema(obvArr, 20)
  const vosc = obvArr.map((x, i) => x - ((obvEma20[i] as number) ?? 0))

  const momentumUp: (boolean | null)[] = Array(n).fill(null)
  for (let i = 0; i < n; i++) momentumUp[i] = i >= 10 ? main.c[i] > main.c[i - 10] : null

  const liquidity = (haC as number[]).map((x, i) => (haO[i] ? ((x - (haO[i] as number)) / (haO[i] as number)) * 100 : null))

  const unifiedSignal = main.c.map((_, i) => (buy[i] ? 1 : sell[i] ? -1 : 0))
  const last = main.c.length - 1
  const prev = last - 1

  const barsSince = (predicate: (v: number, i: number) => boolean) => {
    for (let i = unifiedSignal.length - 1; i >= 0; i--) if (predicate(unifiedSignal[i], i)) return { bars: unifiedSignal.length - 1 - i, index: i }
    return { bars: null as number | null, index: null as number | null }
  }

  const any = barsSince((v) => v !== 0)
  const onlyBuy = barsSince((v) => v === 1)
  const onlySell = barsSince((v) => v === -1)

  let lastSignal = "NONE" as "NONE" | "BUY" | "SELL"
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

  const buildEntrySLTP = (
    close: number[],
    signalArr: number[],
    atrArr: (number | null)[],
    { slMult = 1.0, tp1Mult = 1.0, tp2Mult = 2.0, tp3Mult = 3.0 }
  ) => {
    const n = close.length
    let pos = 0, entry: number | null = null, sl: number | null = null, tp1: number | null = null, tp2: number | null = null, tp3: number | null = null
    for (let i = 1; i < n; i++) {
      if (signalArr[i] === 1) {
        pos = 1
        entry = close[i]
        const a = (atrArr[i] as number) ?? 0
        sl = entry - a * slMult
        tp1 = entry + a * tp1Mult
        tp2 = entry + a * tp2Mult
        tp3 = entry + a * tp3Mult
      } else if (signalArr[i] === -1) {
        pos = -1
        entry = close[i]
        const a = (atrArr[i] as number) ?? 0
        sl = entry + a * slMult
        tp1 = entry - a * tp1Mult
        tp2 = entry - a * tp2Mult
        tp3 = entry - a * tp3Mult
      }
    }
    return { pos, entry, sl, tp1, tp2, tp3 }
  }

  const getSRLevelsForTF = (seriesClose: number[], left = 5, right = 5) => {
    const highs = pivotHigh(seriesClose, left, right)
    const lows = pivotLow(seriesClose, left, right)
    const last = seriesClose.length - 1 - right
    const recentHigh = (() => { for (let i = last; i >= 0; i--) if (highs[i] != null) return highs[i] as number; return null as number | null })()
    const recentLow = (() => { for (let i = last; i >= 0; i--) if (lows[i] != null) return lows[i] as number; return null as number | null })()
    return { recentHigh, recentLow }
  }

  const levels = buildEntrySLTP(main.c, unifiedSignal, atrArr, { slMult: 1, tp1Mult: 1, tp2Mult: 2, tp3Mult: 3 })

  const SR: Record<string, { recentHigh: number | null; recentLow: number | null }> = {}
  for (const tf of intervals) SR[tf] = getSRLevelsForTF(dataByTF[tf].c, 5, 5)

  const rsiVal = rsi2Sma7[last] as number | null
  let rsiStatus = `Trung tính (${rsiVal?.toFixed(1)})`
  if (buy[last] && (rsiVal ?? 50) < 30) rsiStatus = "Đảo chiều tăng (Mua khi quá bán)"
  else if (sell[last] && (rsiVal ?? 50) > 70) rsiStatus = "Đảo chiều giảm (Bán khi quá mua)"
  else if (buy[last] && (rsiVal ?? 50) >= 30) rsiStatus = "Mua theo đà tăng"
  else if (sell[last] && (rsiVal ?? 50) <= 70) rsiStatus = "Bán theo đà giảm"
  else if ((rsiVal ?? 0) > 90) rsiStatus = `Quá mua mạnh (${rsiVal?.toFixed(1)})`
  else if ((rsiVal ?? 100) < 10) rsiStatus = `Quá bán mạnh (${rsiVal?.toFixed(1)})`

  const adxVal = adx[last] as number | null
  const adxStatus = (adxVal ?? 0) > 20 ? `Mạnh (${adxVal?.toFixed(1)})` : `Yếu (${adxVal?.toFixed(1)})`

  const avgVol20 = sma(main.v, 20)[last] as number | null
  const volumeConfirmed = avgVol20 != null ? main.v[last] > avgVol20 * 1.2 : false
  const priceDirection = trendDir[last] === 1 ? "Tăng" : trendDir[last] === -1 ? "Giảm" : "Trung lập"

  // Evaluate last signal outcome (TP/SL hit since signal)
  let lastSignalOutcome: "NONE" | "TP1" | "TP2" | "TP3" | "SL" = "NONE"
  let lastSignalOutcomeIndex: number | null = null
  let lastSignalOutcomePrice: number | null = null
  if (lastSignalIndex != null && lastSignalIndex < last) {
    const dirAtSignal = unifiedSignal[lastSignalIndex]
    const { sl, tp1, tp2, tp3 } = levels
    if (dirAtSignal === 1) {
      for (let i = lastSignalIndex + 1; i <= last; i++) {
        if (sl != null && main.l[i] <= sl) { lastSignalOutcome = "SL"; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = sl; break }
        if (tp3 != null && main.h[i] >= tp3) { lastSignalOutcome = "TP3"; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp3; break }
        if (tp2 != null && main.h[i] >= tp2) { lastSignalOutcome = "TP2"; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp2; break }
        if (tp1 != null && main.h[i] >= tp1) { lastSignalOutcome = "TP1"; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp1; break }
      }
    } else if (dirAtSignal === -1) {
      for (let i = lastSignalIndex + 1; i <= last; i++) {
        if (sl != null && main.h[i] >= sl) { lastSignalOutcome = "SL"; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = sl; break }
        if (tp3 != null && main.l[i] <= tp3) { lastSignalOutcome = "TP3"; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp3; break }
        if (tp2 != null && main.l[i] <= tp2) { lastSignalOutcome = "TP2"; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp2; break }
        if (tp1 != null && main.l[i] <= tp1) { lastSignalOutcome = "TP1"; lastSignalOutcomeIndex = i; lastSignalOutcomePrice = tp1; break }
      }
    }
  }

  return {
    symbol,
    mainTF,
    time: new Date(main.t[last]).toISOString(),
    close: main.c[last],
    priceDirection,
    signal: unifiedSignal[last] === 1 ? "BUY" : unifiedSignal[last] === -1 ? "SELL" : "NONE",
    lastSignal,
    lastSignalIndex,
    lastSignalTime: lastSignalIndex != null ? new Date(main.t[lastSignalIndex]).toISOString() : null,
    lastSignalPrice: lastSignalIndex != null ? main.c[lastSignalIndex] : null,
    barsSinceSignal: any.bars,
    barsSinceBuy: onlyBuy.bars,
    barsSinceSell: onlySell.bars,
    signalAgeMinutes,
    newSignal,
    isSignalFresh,
    entryLevels: levels,
    ema: emaArr[last],
    atr: atrArr[last],
    rsi2Sma7: rsiVal,
    rsiStatus,
    adx: adxVal,
    adxStatus,
    vosc: vosc[last],
    momentum: momentumUp[last] == null ? "N/A" : momentumUp[last] ? "Tăng" : "Giảm",
    volume: main.v[last],
    volumeConfirmed,
    liquidityPct_HA: liquidity[last],
    srLevels: SR,
    settings: { ATR_PERIOD, ATR_MULT, EMA_PERIOD, USE_RMA_ATR, MAX_SIGNAL_AGE_BARS },
    lastSignalOutcome,
    lastSignalOutcomeIndex,
    lastSignalOutcomeTime: lastSignalOutcomeIndex != null ? new Date(main.t[lastSignalOutcomeIndex]).toISOString() : null,
    lastSignalOutcomePrice,
  }
}
