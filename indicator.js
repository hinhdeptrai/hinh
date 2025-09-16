// Node >=18 (ESM). Chạy: node kensine.js
// ENV gợi ý:
//   SYMBOL=BTCUSDT INTERVALS=4h LIMIT=1500 ATR_PERIOD=14 ATR_MULT=1.3 EMA_PERIOD=9 MAX_SIGNAL_AGE_BARS=3 USE_RMA_ATR=1
const SYMBOL = process.env.SYMBOL || "BTCUSDT";
const INTERVALS = (process.env.INTERVALS || "4h").split(",");
const LIMIT = Number(process.env.LIMIT || 1500);
const ATR_PERIOD = Number(process.env.ATR_PERIOD || 14);
const ATR_MULT = Number(process.env.ATR_MULT || 1.3);
const EMA_PERIOD = Number(process.env.EMA_PERIOD || 9);
const MAX_SIGNAL_AGE_BARS = Number(process.env.MAX_SIGNAL_AGE_BARS || 3);
const USE_RMA_ATR = !!Number(process.env.USE_RMA_ATR || 1);

// ==== Utils ====
const toNum = (x) => (x == null ? null : Number(x));
const sma = (arr, p) => {
  const out = Array(arr.length).fill(null);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v == null) {
      out[i] = null;
      continue;
    }
    sum += v;
    if (i >= p) sum -= arr[i - p];
    out[i] = i >= p - 1 ? sum / p : null;
  }
  return out;
};
const ema = (arr, p) => {
  const out = Array(arr.length).fill(null);
  const k = 2 / (p + 1);
  let prev = null;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v == null) {
      out[i] = prev;
      continue;
    }
    if (prev == null) prev = v;
    else prev = v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
};
// Wilder RMA (sát Pine)
const rma = (arr, p) => {
  const out = Array(arr.length).fill(null);
  let prev = null;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v == null) {
      out[i] = prev;
      continue;
    }
    if (i === p - 1) {
      let sum = 0;
      for (let j = 0; j < p; j++) sum += arr[j] ?? 0;
      prev = sum / p;
      out[i] = prev;
    } else if (i >= p) {
      prev = (prev * (p - 1) + v) / p;
      out[i] = prev;
    }
  }
  return out;
};

const rsi = (arr, p) => {
  const out = Array(arr.length).fill(null);
  let avgGain = 0,
    avgLoss = 0;
  for (let i = 1; i < arr.length; i++) {
    const change = (arr[i] ?? 0) - (arr[i - 1] ?? 0);
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= p) {
      avgGain += gain;
      avgLoss += loss;
      if (i === p) {
        avgGain /= p;
        avgLoss /= p;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out[i] = 100 - 100 / (1 + rs);
      }
    } else {
      avgGain = (avgGain * (p - 1) + gain) / p;
      avgLoss = (avgLoss * (p - 1) + loss) / p;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
};

const trueRangeSeries = (high, low, close) => {
  const n = high.length;
  const tr = Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i === 0) tr[i] = high[i] - low[i];
    else {
      const hl = high[i] - low[i];
      const hc = Math.abs(high[i] - close[i - 1]);
      const lc = Math.abs(low[i] - close[i - 1]);
      tr[i] = Math.max(hl, hc, lc);
    }
  }
  return tr;
};
const atrSeries = (high, low, close, p) => {
  const tr = trueRangeSeries(high, low, close);
  return USE_RMA_ATR ? rma(tr, p) : ema(tr, p);
};

const obv = (close, volume) => {
  const out = Array(close.length).fill(0);
  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) out[i] = out[i - 1] + volume[i];
    else if (close[i] < close[i - 1]) out[i] = out[i - 1] - volume[i];
    else out[i] = out[i - 1];
  }
  return out;
};

// DMI / ADX (period p)
const dmiAdx = (high, low, close, p) => {
  const n = high.length;
  const plusDM = Array(n).fill(0);
  const minusDM = Array(n).fill(0);
  const TR = trueRangeSeries(high, low, close);

  for (let i = 1; i < n; i++) {
    const up = high[i] - high[i - 1];
    const dn = low[i - 1] - low[i];
    plusDM[i] = up > dn && up > 0 ? up : 0;
    minusDM[i] = dn > up && dn > 0 ? dn : 0;
  }
  const smoothTR = USE_RMA_ATR ? rma(TR, p) : ema(TR, p);
  const smoothPlusDM = USE_RMA_ATR ? rma(plusDM, p) : ema(plusDM, p);
  const smoothMinusDM = USE_RMA_ATR ? rma(minusDM, p) : ema(minusDM, p);

  const plusDI = Array(n).fill(null);
  const minusDI = Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (smoothTR[i] == null || smoothTR[i] === 0) continue;
    plusDI[i] = 100 * (smoothPlusDM[i] / smoothTR[i]);
    minusDI[i] = 100 * (smoothMinusDM[i] / smoothTR[i]);
  }
  const dx = Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (plusDI[i] == null || minusDI[i] == null) continue;
    const den = plusDI[i] + minusDI[i];
    dx[i] = den === 0 ? 0 : 100 * (Math.abs(plusDI[i] - minusDI[i]) / den);
  }
  const adx = USE_RMA_ATR ? rma(dx, p) : ema(dx, p);
  return { plusDI, minusDI, adx };
};

// Heikin Ashi
const heikinAshi = (o, h, l, c) => {
  const n = o.length;
  const haO = Array(n).fill(null);
  const haH = Array(n).fill(null);
  const haL = Array(n).fill(null);
  const haC = Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    haC[i] = (o[i] + h[i] + l[i] + c[i]) / 4;
    if (i === 0) haO[i] = (o[i] + c[i]) / 2;
    else haO[i] = (haO[i - 1] + haC[i - 1]) / 2;
    haH[i] = Math.max(h[i], haO[i], haC[i]);
    haL[i] = Math.min(l[i], haO[i], haC[i]);
  }
  return { haO, haH, haL, haC };
};

// Pivot high/low (giống Pine)
const pivotHigh = (high, left, right) => {
  const n = high.length;
  const out = Array(n).fill(null);
  for (let i = left; i < n - right; i++) {
    let isPivot = true;
    for (let j = 1; j <= left; j++)
      if (high[i] <= high[i - j]) {
        isPivot = false;
        break;
      }
    if (!isPivot) continue;
    for (let j = 1; j <= right; j++)
      if (high[i] <= high[i + j]) {
        isPivot = false;
        break;
      }
    if (isPivot) out[i] = high[i];
  }
  return out;
};
const pivotLow = (low, left, right) => {
  const n = low.length;
  const out = Array(n).fill(null);
  for (let i = left; i < n - right; i++) {
    let isPivot = true;
    for (let j = 1; j <= left; j++)
      if (low[i] >= low[i - j]) {
        isPivot = false;
        break;
      }
    if (!isPivot) continue;
    for (let j = 1; j <= right; j++)
      if (low[i] >= low[i + j]) {
        isPivot = false;
        break;
      }
    if (isPivot) out[i] = low[i];
  }
  return out;
};

// ==== Binance ====
async function fetchKlines(symbol, interval, limit = 500) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance error ${res.status} ${res.statusText}`);
  const data = await res.json();
  // Kline: [ openTime, open, high, low, close, volume, closeTime, ... ]
  const o = data.map((k) => toNum(k[1]));
  const h = data.map((k) => toNum(k[2]));
  const l = data.map((k) => toNum(k[3]));
  const c = data.map((k) => toNum(k[4]));
  const v = data.map((k) => toNum(k[5]));
  const t = data.map((k) => Number(k[0]));
  return { t, o, h, l, c, v };
}

// ==== Core logic ====
function computeCore({ o, h, l, c, v }) {
  const n = c.length;
  const { haO, haH, haL, haC } = heikinAshi(o, h, l, c);

  // Supertrend-like (theo code Pine): upper = haC - ATR*mult; lower = haC + ATR*mult
  const atrArr = atrSeries(h, l, c, ATR_PERIOD);
  const upperBand = haC.map((x, i) => x - ATR_MULT * (atrArr[i] ?? 0));
  const lowerBand = haC.map((x, i) => x + ATR_MULT * (atrArr[i] ?? 0));

  const trendUp = Array(n).fill(null);
  const trendDown = Array(n).fill(null);
  const trendDir = Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      trendUp[i] = upperBand[i];
      trendDown[i] = lowerBand[i];
      trendDir[i] = 1; // na(prev) ? 1
      continue;
    }
    trendUp[i] =
      haC[i - 1] > trendUp[i - 1]
        ? Math.max(upperBand[i], trendUp[i - 1])
        : upperBand[i];
    trendDown[i] =
      haC[i - 1] < trendDown[i - 1]
        ? Math.min(lowerBand[i], trendDown[i - 1])
        : lowerBand[i];

    let dir = trendDir[i - 1] ?? 1;
    if (dir === -1 && haC[i] > trendDown[i - 1]) dir = 1;
    else if (dir === 1 && haC[i] < trendUp[i - 1]) dir = -1;
    trendDir[i] = dir;
  }

  const emaArr = ema(c, EMA_PERIOD);

  // Tín hiệu chuyển pha + EMA filter
  const buy = Array(n).fill(false);
  const sell = Array(n).fill(false);
  for (let i = 1; i < n; i++) {
    buy[i] =
      trendDir[i] === 1 && trendDir[i - 1] === -1 && c[i] > (emaArr[i] ?? c[i]);
    sell[i] =
      trendDir[i] === -1 && trendDir[i - 1] === 1 && c[i] < (emaArr[i] ?? c[i]);
  }

  const rsi2 = rsi(c, 2);
  const rsi2Sma7 = sma(rsi2, 7);

  const { adx } = dmiAdx(h, l, c, 14);

  const obvArr = obv(c, v);
  const obvEma20 = ema(obvArr, 20);
  const vosc = obvArr.map((x, i) => x - (obvEma20[i] ?? 0));

  const momentumUp = Array(n).fill(null);
  for (let i = 0; i < n; i++) momentumUp[i] = i >= 10 ? c[i] > c[i - 10] : null;

  const liquidity = haC.map((x, i) =>
    haO[i] ? ((x - haO[i]) / haO[i]) * 100 : null
  );

  return {
    haO,
    haH,
    haL,
    haC,
    atrArr,
    upperBand,
    lowerBand,
    trendUp,
    trendDown,
    trendDir,
    emaArr,
    buy,
    sell,
    rsi2,
    rsi2Sma7,
    adx,
    obvArr,
    obvEma20,
    vosc,
    momentumUp,
    liquidity,
  };
}

// SR theo TF (pivot gần nhất)
function getSRLevelsForTF(seriesClose, left = 5, right = 5) {
  const highs = pivotHigh(seriesClose, left, right);
  const lows = pivotLow(seriesClose, left, right);
  const last = seriesClose.length - 1 - right;
  const recentHigh = (() => {
    for (let i = last; i >= 0; i--) if (highs[i] != null) return highs[i];
    return null;
  })();
  const recentLow = (() => {
    for (let i = last; i >= 0; i--) if (lows[i] != null) return lows[i];
    return null;
  })();
  return { recentHigh, recentLow };
}

// Entry/SL/TP dựa trên tín hiệu gần nhất
function buildEntrySLTP(
  close,
  signalArr,
  atrArr,
  { slMult = 1.0, tp1Mult = 1.0, tp2Mult = 2.0, tp3Mult = 3.0 }
) {
  const n = close.length;
  let pos = 0,
    entry = null,
    sl = null,
    tp1 = null,
    tp2 = null,
    tp3 = null;
  for (let i = 1; i < n; i++) {
    if (signalArr[i] === 1) {
      // buy
      pos = 1;
      entry = close[i];
      const a = atrArr[i] ?? 0;
      sl = entry - a * slMult;
      tp1 = entry + a * tp1Mult;
      tp2 = entry + a * tp2Mult;
      tp3 = entry + a * tp3Mult;
    } else if (signalArr[i] === -1) {
      // sell
      pos = -1;
      entry = close[i];
      const a = atrArr[i] ?? 0;
      sl = entry + a * slMult;
      tp1 = entry - a * tp1Mult;
      tp2 = entry - a * tp2Mult;
      tp3 = entry - a * tp3Mult;
    }
  }
  return { pos, entry, sl, tp1, tp2, tp3 };
}

// Bars-since helpers
function barsSince(arr, predicate) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i], i)) return { bars: arr.length - 1 - i, index: i };
  }
  return { bars: null, index: null };
}
function intervalToMinutes(interval) {
  const m = interval.match(/^(\d+)([mhdw])$/i);
  if (!m) return null;
  const num = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === "m") return num;
  if (u === "h") return num * 60;
  if (u === "d") return num * 60 * 24;
  if (u === "w") return num * 60 * 24 * 7;
  return null;
}

(async () => {
  try {
    // Tải dữ liệu theo TF
    const dataByTF = {};
    for (const tf of INTERVALS)
      dataByTF[tf] = await fetchKlines(SYMBOL, tf, LIMIT);

    // Khung chính
    const mainTF = INTERVALS[0];
    const main = dataByTF[mainTF];
    const res = computeCore(main);

    // Tín hiệu 1 / -1 / 0
    const unifiedSignal = main.c.map((_, i) =>
      res.buy[i] ? 1 : res.sell[i] ? -1 : 0
    );

    // Bars since signal
    const { bars: barsSinceAny, index: lastAnyIdx } = barsSince(
      unifiedSignal,
      (v) => v !== 0
    );
    const { bars: barsSinceBuy, index: lastBuyIdx } = barsSince(
      unifiedSignal,
      (v) => v === 1
    );
    const { bars: barsSinceSell, index: lastSellIdx } = barsSince(
      unifiedSignal,
      (v) => v === -1
    );

    let lastSignal = "NONE",
      lastSignalIndex = null;
    if (lastAnyIdx !== null) {
      lastSignal = unifiedSignal[lastAnyIdx] === 1 ? "BUY" : "SELL";
      lastSignalIndex = lastAnyIdx;
    }
    const lastSignalPrice =
      lastSignalIndex != null ? main.c[lastSignalIndex] : null;
    const lastSignalTime =
      lastSignalIndex != null
        ? new Date(main.t[lastSignalIndex]).toISOString()
        : null;

    const tfMinutes = intervalToMinutes(mainTF);
    const signalAgeMinutes =
      barsSinceAny != null && tfMinutes != null
        ? barsSinceAny * tfMinutes
        : null;

    // Tín hiệu MỚI tại nến hiện tại?
    const last = main.c.length - 1,
      prev = last - 1;
    const newSignal =
      prev >= 0
        ? unifiedSignal[last] !== 0 && unifiedSignal[prev] === 0
          ? unifiedSignal[last] === 1
            ? "NEW_BUY"
            : "NEW_SELL"
          : "NONE"
        : "NONE";

    // Tín hiệu còn "fresh" trong N nến?
    const isSignalFresh =
      barsSinceAny != null ? barsSinceAny <= MAX_SIGNAL_AGE_BARS : false;

    // Entry/SL/TP
    const levels = buildEntrySLTP(main.c, unifiedSignal, res.atrArr, {
      slMult: 1.0,
      tp1Mult: 1.0,
      tp2Mult: 2.0,
      tp3Mult: 3.0,
    });

    // SR đa khung
    const SR = {};
    for (const tf of INTERVALS) {
      const cl = dataByTF[tf].c;
      SR[tf] = getSRLevelsForTF(cl, 5, 5);
    }

    // RSI label
    const rsiVal = res.rsi2Sma7[last];
    let rsiStatus = `Trung tính (${rsiVal?.toFixed(1)})`;
    if (res.buy[last] && rsiVal < 30)
      rsiStatus = "Đảo chiều tăng (Mua khi quá bán)";
    else if (res.sell[last] && rsiVal > 70)
      rsiStatus = "Đảo chiều giảm (Bán khi quá mua)";
    else if (res.buy[last] && rsiVal >= 30) rsiStatus = "Mua theo đà tăng";
    else if (res.sell[last] && rsiVal <= 70) rsiStatus = "Bán theo đà giảm";
    else if (rsiVal > 90) rsiStatus = `Quá mua mạnh (${rsiVal?.toFixed(1)})`;
    else if (rsiVal < 10) rsiStatus = `Quá bán mạnh (${rsiVal?.toFixed(1)})`;

    // ADX status
    const adxVal = res.adx[last];
    const adxStatus =
      adxVal > 20
        ? `Mạnh (${adxVal?.toFixed(1)})`
        : `Yếu (${adxVal?.toFixed(1)})`;

    // Momentum & Volume
    const momentum =
      res.momentumUp[last] == null
        ? "N/A"
        : res.momentumUp[last]
        ? "Tăng"
        : "Giảm";
    const avgVol20 = sma(main.v, 20)[last];
    const volumeConfirmed =
      avgVol20 != null ? main.v[last] > avgVol20 * 1.2 : false;

    // Hướng hiện tại
    const priceDirection =
      res.trendDir[last] === 1
        ? "Tăng"
        : res.trendDir[last] === -1
        ? "Giảm"
        : "Trung lập";

    const output = {
      symbol: SYMBOL,
      mainTF,
      time: new Date(main.t[last]).toISOString(),
      close: main.c[last],
      priceDirection,
      signal:
        unifiedSignal[last] === 1
          ? "BUY"
          : unifiedSignal[last] === -1
          ? "SELL"
          : "NONE",

      // NEW: thông tin tín hiệu & tuổi tín hiệu
      lastSignal,
      lastSignalIndex,
      lastSignalTime,
      lastSignalPrice,
      barsSinceSignal: barsSinceAny,
      barsSinceBuy,
      barsSinceSell,
      signalAgeMinutes,
      newSignal, // NEW_BUY / NEW_SELL / NONE
      isSignalFresh, // true/false theo MAX_SIGNAL_AGE_BARS

      entryLevels: levels, // {pos, entry, sl, tp1, tp2, tp3}

      ema: res.emaArr[last],
      atr: res.atrArr[last],
      rsi2Sma7: rsiVal,
      rsiStatus,
      adx: adxVal,
      adxStatus,
      vosc: res.vosc[last],
      momentum,
      volume: main.v[last],
      volumeConfirmed,
      liquidityPct_HA: res.liquidity[last],

      srLevels: SR, // { "4h": { recentHigh, recentLow }, ... }
      settings: {
        ATR_PERIOD,
        ATR_MULT,
        EMA_PERIOD,
        USE_RMA_ATR,
        MAX_SIGNAL_AGE_BARS,
      },
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
