import type { BaseIndicator, IndicatorType, Klines, IndicatorResult } from './types'
import { MacdBBIndicator } from './macd-bb'
import { RsiMacdEmaIndicator } from './rsi-macd-ema'
import { FibonacciAlgoIndicator } from './fibonacci-algo'
import { RsiVolumeBBIndicator } from './rsi-volume-bb'
import { SupertrendEmaIndicator } from './supertrend-ema'
import { EmaCrossRsiIndicator } from './ema-cross-rsi'

export class IndicatorFactory {
  private static indicators: Map<IndicatorType, BaseIndicator> = new Map()

  static {
    // Register all available indicators
    IndicatorFactory.indicators.set('FIBONACCI_ALGO', new FibonacciAlgoIndicator())
    IndicatorFactory.indicators.set('MACD_BB', new MacdBBIndicator())
    IndicatorFactory.indicators.set('RSI_MACD_EMA', new RsiMacdEmaIndicator())
    IndicatorFactory.indicators.set('RSI_VOLUME_BB', new RsiVolumeBBIndicator())
    IndicatorFactory.indicators.set('SUPERTREND_EMA', new SupertrendEmaIndicator())
    IndicatorFactory.indicators.set('EMA_CROSS_RSI', new EmaCrossRsiIndicator())
  }

  static create(type: IndicatorType): BaseIndicator {
    const indicator = IndicatorFactory.indicators.get(type)
    if (!indicator) {
      throw new Error(`Indicator type "${type}" not found. Available: ${Array.from(IndicatorFactory.indicators.keys()).join(', ')}`)
    }
    return indicator
  }

  static getAvailableIndicators(): Array<{
    type: IndicatorType
    name: string
    description: string
    winRate: number
  }> {
    return Array.from(IndicatorFactory.indicators.entries()).map(([type, indicator]) => ({
      type,
      name: indicator.getName(),
      description: indicator.getDescription(),
      winRate: indicator.getWinRate(),
    }))
  }

  static async analyzeWithIndicator(
    type: IndicatorType,
    data: Klines,
    symbol: string,
    mainTF: string,
    settings?: any
  ): Promise<IndicatorResult> {
    const indicator = IndicatorFactory.create(type)

    // Special handling for FIBONACCI_ALGO (uses old API)
    if (type === 'FIBONACCI_ALGO') {
      const fibIndicator = indicator as any
      if (fibIndicator.analyzeWithSymbol) {
        return await fibIndicator.analyzeWithSymbol(symbol, mainTF, settings)
      }
    }

    // Normal indicators
    const result = await indicator.analyze(data, settings)

    // Fill in symbol and mainTF
    result.symbol = symbol
    result.mainTF = mainTF

    return result
  }
}

export async function fetchKlines(symbol: string, interval: string, limit = 500): Promise<Klines> {
  const toNum = (x: any) => (x == null ? null : Number(x))

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Binance error ${res.status} ${res.statusText}`)
  const rawData = await res.json()

  const o = rawData.map((k: any[]) => toNum(k[1]) as number)
  const h = rawData.map((k: any[]) => toNum(k[2]) as number)
  const l = rawData.map((k: any[]) => toNum(k[3]) as number)
  const c = rawData.map((k: any[]) => toNum(k[4]) as number)
  const v = rawData.map((k: any[]) => toNum(k[5]) as number)
  const t = rawData.map((k: any[]) => Number(k[0]))

  return { t, o, h, l, c, v }
}
