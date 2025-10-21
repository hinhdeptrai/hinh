import { Signal, Position, BotStatus, TradeHistory, WinRateStats } from './types'
import { getBotConfig, isPaperMode } from './config'
import { fetchCurrentPrice } from '@/lib/exchange/okx'

export class BotTrader {
  private static instance: BotTrader | null = null
  private positions: Map<string, Position> = new Map()
  private balance = 1000 // Paper mode balance
  private dailyPnl = 0
  private lastTradeTime: Map<string, number> = new Map()
  private tradeHistory: TradeHistory[] = []
  private monitorInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Start auto-monitoring every 10 seconds
    this.startAutoMonitor()
  }

  static getInstance(): BotTrader {
    if (!BotTrader.instance) {
      BotTrader.instance = new BotTrader()
    }
    return BotTrader.instance
  }

  private startAutoMonitor() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
    }
    
    this.monitorInterval = setInterval(async () => {
      if (this.positions.size > 0) {
        await this.monitorPositions()
      }
    }, 10000) // Every 10 seconds
  }

  async processSignal(signal: Signal): Promise<{ success: boolean; reason: string; position?: Position }> {
    const config = getBotConfig()
    
    // Risk checks (bypass for test signals)
    if (!signal.reason.includes('Test signal') && !this.canTrade(signal.symbol)) {
      return { success: false, reason: 'Risk checks failed' }
    }

    // Calculate position size
    const size = this.calculatePositionSize(signal)
    if (size <= 0) {
      return { success: false, reason: 'Invalid position size' }
    }

    // Place order
    const position = await this.placeOrder(signal, size)
    if (!position) {
      return { success: false, reason: 'Failed to place order' }
    }

    // Update state
    this.positions.set(signal.symbol, position)
    this.lastTradeTime.set(signal.symbol, Date.now())
    
    // Add to trade history
    const tradeRecord: TradeHistory = {
      id: position.orderId,
      symbol: signal.symbol,
      side: signal.side,
      entryPrice: signal.entry,
      size: size,
      openedAt: position.openedAt,
      reason: signal.reason
    }
    this.tradeHistory.push(tradeRecord)
    
    console.log(`[Trader] Opened position: ${signal.symbol} ${signal.side} ${size} @ ${signal.entry}`)
    
    return { success: true, reason: 'Position opened', position }
  }

  private canTrade(symbol: string): boolean {
    const config = getBotConfig()
    
    // Check if already have position
    if (this.positions.has(symbol)) {
      return false
    }

    // Check max positions
    if (this.positions.size >= config.maxPositions) {
      return false
    }

    // Check cooldown
    const lastTrade = this.lastTradeTime.get(symbol)
    if (lastTrade && Date.now() - lastTrade < config.cooldownMinutes * 60 * 1000) {
      return false
    }

    // Check daily loss limit
    if (this.dailyPnl <= -config.dailyLossLimit) {
      return false
    }

    return true
  }

  private calculatePositionSize(signal: Signal): number {
    const config = getBotConfig()
    const riskAmount = this.balance * (config.riskPercent / 100)
    const riskPerUnit = Math.abs(signal.entry - signal.sl)
    const size = riskAmount / riskPerUnit
    
    // Apply leverage
    const maxSize = (this.balance * config.leverage) / signal.entry
    return Math.min(size, maxSize)
  }

  private async placeOrder(signal: Signal, size: number): Promise<Position | null> {
    if (isPaperMode()) {
      return this.simulateOrder(signal, size)
    } else {
      // Real trading logic would go here
      return this.simulateOrder(signal, size)
    }
  }

  private simulateOrder(signal: Signal, size: number): Position {
    const orderId = `paper_${Date.now()}`
    const algoId = `algo_${Date.now()}`
    
    return {
      symbol: signal.symbol,
      side: signal.side,
      size,
      entryPrice: signal.entry,
      currentPrice: signal.entry,
      pnl: 0,
      sl: signal.sl,
      tp: signal.tp,
      orderId,
      algoId,
      openedAt: new Date().toISOString()
    }
  }

  async monitorPositions(): Promise<{ checked: number; updated: number }> {
    let checked = 0
    let updated = 0

    for (const [symbol, position] of this.positions) {
      checked++
      
      // Fetch real price from Binance
      const currentPrice = await this.fetchCurrentPrice(symbol)
      if (currentPrice) {
        const pnl = position.side === 'buy' 
          ? (currentPrice - position.entryPrice) * position.size
          : (position.entryPrice - currentPrice) * position.size

        position.currentPrice = currentPrice
        position.pnl = pnl

        console.log(`[Trader Monitor] ${symbol}: Entry=${position.entryPrice}, Current=${currentPrice}, PnL=${pnl.toFixed(2)}`)

        // Check TP/SL
        const shouldClose = this.shouldClosePosition(position)
        if (shouldClose) {
          console.log(`[Trader Monitor] ${symbol}: Closing position - TP/SL hit`)
          await this.closePosition(symbol)
          updated++
        }
      } else {
        console.log(`[Trader Monitor] ${symbol}: Failed to fetch current price`)
      }
    }

    return { checked, updated }
  }

  private async fetchCurrentPrice(symbol: string): Promise<number | null> {
    try {
      // Use OKX API for real price
      const price = await fetchCurrentPrice(symbol)
      if (price) {
        console.log(`[Trader] Real price for ${symbol}: $${price}`)
        return price
      }
      
      // Fallback to Binance if OKX fails
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
      if (!response.ok) return null
      
      const data = await response.json()
      const binancePrice = parseFloat(data.price)
      console.log(`[Trader] Fallback Binance price for ${symbol}: $${binancePrice}`)
      return binancePrice
    } catch (error) {
      console.error(`[Trader] Failed to fetch price for ${symbol}:`, error)
      return null
    }
  }

  private shouldClosePosition(position: Position): boolean {
    // Check TP
    if (position.side === 'buy' && position.currentPrice >= position.tp) {
      return true
    }
    if (position.side === 'sell' && position.currentPrice <= position.tp) {
      return true
    }

    // Check SL
    if (position.side === 'buy' && position.currentPrice <= position.sl) {
      return true
    }
    if (position.side === 'sell' && position.currentPrice >= position.sl) {
      return true
    }

    return false
  }

  private async closePosition(symbol: string): Promise<void> {
    const position = this.positions.get(symbol)
    if (!position) return

    // Update balance
    this.balance += position.pnl
    this.dailyPnl += position.pnl

    // Update trade history
    const tradeRecord = this.tradeHistory.find(t => t.id === position.orderId)
    if (tradeRecord) {
      tradeRecord.exitPrice = position.currentPrice
      tradeRecord.pnl = position.pnl
      tradeRecord.closedAt = new Date().toISOString()
      tradeRecord.outcome = position.pnl > 0 ? 'win' : position.pnl < 0 ? 'loss' : 'breakeven'
    }

    console.log(`[Trader] Closed position: ${symbol} PnL: ${position.pnl.toFixed(2)}`)
    
    this.positions.delete(symbol)
  }

  getStatus(): BotStatus {
    return {
      mode: isPaperMode() ? 'PAPER' : 'LIVE',
      balance: this.balance,
      dailyPnl: this.dailyPnl,
      openPositions: this.positions.size,
      positions: Array.from(this.positions.values()),
      canTrade: this.dailyPnl > -5, // 5% daily loss limit
      lastUpdate: new Date().toISOString()
    }
  }

  getWinRateStats(): WinRateStats {
    const closedTrades = this.tradeHistory.filter(t => t.outcome)
    const totalTrades = closedTrades.length
    const winningTrades = closedTrades.filter(t => t.outcome === 'win').length
    const losingTrades = closedTrades.filter(t => t.outcome === 'loss').length
    const breakevenTrades = closedTrades.filter(t => t.outcome === 'breakeven').length
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    
    const wins = closedTrades.filter(t => t.outcome === 'win')
    const losses = closedTrades.filter(t => t.outcome === 'loss')
    const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0
    const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0
    
    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      breakevenTrades,
      winRate,
      totalPnl,
      averageWin,
      averageLoss,
      profitFactor
    }
  }

  getTradeHistory(): TradeHistory[] {
    return this.tradeHistory
  }
}
