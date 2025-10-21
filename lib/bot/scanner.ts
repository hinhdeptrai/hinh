import { BreakoutStrategy } from './strategy'
import { Signal } from './types'
import { getBotConfig } from './config'
import { BotTrader } from './trader'

export class BotScanner {
  private strategy = new BreakoutStrategy()
  private trader = BotTrader.getInstance()

  async scanAndTrade(): Promise<{ scanned: number; signals: Signal[]; trades: any[]; errors: string[] }> {
    const config = getBotConfig()
    const signals: Signal[] = []
    const trades: any[] = []
    const errors: string[] = []

    console.log(`[Scanner] Starting auto scan & trade for ${config.symbolWhitelist.length} symbols`)

    for (const symbol of config.symbolWhitelist) {
      try {
        const signal = await this.scanSymbol(symbol)
        if (signal) {
          signals.push(signal)
          console.log(`[Scanner] Signal found for ${symbol}: ${signal.side} at ${signal.entry}`)
          
          // Auto trade the signal
          const tradeResult = await this.trader.processSignal(signal)
          if (tradeResult.success) {
            trades.push({
              symbol: signal.symbol,
              side: signal.side,
              entry: signal.entry,
              size: tradeResult.position?.size,
              orderId: tradeResult.position?.orderId,
              timestamp: new Date().toISOString()
            })
            console.log(`[Scanner] Auto traded ${symbol}: ${signal.side} @ ${signal.entry}`)
          } else {
            console.log(`[Scanner] Failed to trade ${symbol}: ${tradeResult.reason}`)
          }
        }
      } catch (error: any) {
        console.error(`[Scanner] Error scanning ${symbol}:`, error)
        errors.push(`${symbol}: ${error.message}`)
      }
    }

    console.log(`[Scanner] Completed: ${signals.length} signals, ${trades.length} trades executed`)
    return {
      scanned: config.symbolWhitelist.length,
      signals,
      trades,
      errors
    }
  }

  private async scanSymbol(symbol: string): Promise<Signal | null> {
    try {
      console.log(`[Scanner] Scanning ${symbol}...`)
      
      // Fetch klines from Binance
      const klines = await this.fetchKlines(symbol, '5m', 100)
      
      if (!klines || klines.c.length < 20) {
        console.log(`[Scanner] ${symbol}: Insufficient data (${klines?.c.length || 0} candles)`)
        return null
      }

      console.log(`[Scanner] ${symbol}: Got ${klines.c.length} candles, latest price: ${klines.c[klines.c.length - 1]}`)

      // Analyze with strategy
      const result = await this.strategy.analyze(symbol, '5m', klines)
      
      console.log(`[Scanner] ${symbol}: Strategy result:`, result)
      
      if (!result.side) {
        console.log(`[Scanner] ${symbol}: No signal - ${result.reason}`)
        return null
      }

      console.log(`[Scanner] ${symbol}: Signal found - ${result.side} @ ${result.entry}`)
      return this.createSignal(symbol, result)
    } catch (error: any) {
      console.error(`[Scanner] Error scanning ${symbol}:`, error)
      return null
    }
  }

  private createSignal(symbol: string, result: any): Signal {
    // Calculate candle close time
    const now = new Date()
    const nextMinute = Math.ceil(now.getMinutes() / 5) * 5
    const candleCloseTime = new Date(now)
    candleCloseTime.setMinutes(nextMinute, 0, 0)

    return {
      symbol,
      timeframe: '5m',
      side: result.side,
      entry: result.entry,
      sl: result.sl,
      tp: result.tp,
      confidence: result.confidence,
      reason: result.reason,
      candleCloseTime: candleCloseTime.toISOString(),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
  }

  private async fetchKlines(symbol: string, timeframe: string, limit: number) {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`
      )
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        t: data.map((k: any) => k[0]),
        o: data.map((k: any) => parseFloat(k[1])),
        h: data.map((k: any) => parseFloat(k[2])),
        l: data.map((k: any) => parseFloat(k[3])),
        c: data.map((k: any) => parseFloat(k[4])),
        v: data.map((k: any) => parseFloat(k[5]))
      }
    } catch (error: any) {
      console.error(`[Scanner] Failed to fetch klines for ${symbol}:`, error)
      throw error
    }
  }
}
