export type IndicatorType =
  | 'FIBONACCI_ALGO'      // Current implementation
  | 'RSI_MACD_EMA'        // 73% win rate
  | 'MACD_BB'             // 78% win rate
  | 'RSI_VOLUME_BB'       // 70% win rate
  | 'SUPERTREND_EMA'      // 65% win rate
  | 'EMA_CROSS_RSI'       // 60% win rate

export type SignalType = 'BUY' | 'SELL' | 'NONE'

export type IndicatorResult = {
  symbol: string
  mainTF: string
  time: string
  close: number
  signal: SignalType
  lastSignal: SignalType
  lastSignalIndex: number | null
  lastSignalTime: string | null
  lastSignalPrice: number | null
  barsSinceSignal: number | null
  barsSinceBuy: number | null
  barsSinceSell: number | null
  signalAgeMinutes: number | null
  newSignal: 'NEW_BUY' | 'NEW_SELL' | 'NONE'
  isSignalFresh: boolean
  entryLevels: {
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
  volume: number
  volumeConfirmed: boolean
  priceDirection: string
  srLevels: Record<string, { recentHigh: number | null; recentLow: number | null }>
  settings: any
  lastSignalOutcome: 'NONE' | 'TP1' | 'TP2' | 'TP3' | 'TP4' | 'TP5' | 'TP6' | 'SL'
  lastSignalOutcomeIndex: number | null
  lastSignalOutcomeTime: string | null
  lastSignalOutcomePrice: number | null
  confidence?: number // 0-100
  reasons?: string[] // Lý do tạo signal
  indicatorType?: IndicatorType // Loại indicator được sử dụng
}

export type Klines = {
  t: number[]
  o: number[]
  h: number[]
  l: number[]
  c: number[]
  v: number[]
}

export interface BaseIndicatorSettings {
  // Risk management (percent)
  TP1_LONG_PCT?: number
  TP2_LONG_PCT?: number
  TP3_LONG_PCT?: number
  TP4_LONG_PCT?: number
  TP5_LONG_PCT?: number
  TP6_LONG_PCT?: number
  TP1_SHORT_PCT?: number
  TP2_SHORT_PCT?: number
  TP3_SHORT_PCT?: number
  TP4_SHORT_PCT?: number
  TP5_SHORT_PCT?: number
  TP6_SHORT_PCT?: number
  SL_LONG_PCT?: number
  SL_SHORT_PCT?: number
  MAX_SIGNAL_AGE_BARS?: number
}

export interface BaseIndicator {
  analyze(data: Klines, settings?: any): Promise<IndicatorResult>
  getName(): string
  getDescription(): string
  getDefaultSettings(): any
  getWinRate(): number // Expected win rate
}

// Fibonacci Algo specific settings
export interface FibonacciAlgoSettings extends BaseIndicatorSettings {
  PIVOT_PERIOD?: number
  THRESHOLD_RATE_PCT?: number
  MIN_TESTS?: number
  MAX_LEVELS?: number
  MA_TYPE?: 'EMA' | 'SMA'
  MA_LENGTH?: number
  MA_FILTER?: boolean
  USE_HEIKEN_ASHI?: boolean
  ENABLE_CUP_PATTERN?: boolean
}

// MACD + BB settings
export interface MacdBBSettings extends BaseIndicatorSettings {
  MACD_FAST?: number
  MACD_SLOW?: number
  MACD_SIGNAL?: number
  BB_PERIOD?: number
  BB_STD_DEV?: number
  MIN_VOLUME_MULTIPLIER?: number
}

// RSI + MACD + EMA settings
export interface RsiMacdEmaSettings extends BaseIndicatorSettings {
  RSI_PERIOD?: number
  RSI_OVERBOUGHT?: number
  RSI_OVERSOLD?: number
  MACD_FAST?: number
  MACD_SLOW?: number
  MACD_SIGNAL?: number
  EMA_PERIOD?: number
}

// RSI + Volume + BB settings
export interface RsiVolumeBBSettings extends BaseIndicatorSettings {
  RSI_PERIOD?: number
  RSI_OVERBOUGHT?: number
  RSI_OVERSOLD?: number
  BB_PERIOD?: number
  BB_STD_DEV?: number
  VOLUME_SPIKE_THRESHOLD?: number
  VOLUME_MA_PERIOD?: number
}

// Supertrend + EMA settings
export interface SupertrendEmaSettings extends BaseIndicatorSettings {
  SUPERTREND_PERIOD?: number
  SUPERTREND_MULTIPLIER?: number
  EMA_FAST?: number
  EMA_SLOW?: number
}

// EMA Cross + RSI settings
export interface EmaCrossRsiSettings extends BaseIndicatorSettings {
  EMA_FAST?: number
  EMA_SLOW?: number
  RSI_PERIOD?: number
  RSI_CONFIRMATION?: number
}

// Unified settings type
export type IndicatorSettings =
  | FibonacciAlgoSettings
  | MacdBBSettings
  | RsiMacdEmaSettings
  | RsiVolumeBBSettings
  | SupertrendEmaSettings
  | EmaCrossRsiSettings
