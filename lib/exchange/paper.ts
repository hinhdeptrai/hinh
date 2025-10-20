type PaperPosition = {
  symbol: string
  side: 'buy' | 'sell'
  size: number
  entry: number
  sl?: number
  tp?: number
}

class PaperManager {
  positions = new Map<string, PaperPosition>()
  balance = Number(process.env.OKX_PAPER_BALANCE || '1000')
  initialBalance = this.balance
  totalPnl = 0
  totalTrades = 0
  wins = 0

  simulateExecution(side: 'buy' | 'sell', price: number, size: number): { executedPrice: number; fee: number } {
    // Simulate slippage 0.1%
    const slippage = side === 'buy' ? 1.001 : 0.999
    const executedPrice = price * slippage
    // Simulate fee 0.08% taker
    const feeRate = 0.0008
    const notional = executedPrice * size
    const fee = notional * feeRate
    return { executedPrice, fee }
  }

  openPosition(p: PaperPosition) {
    if (this.positions.has(p.symbol)) {
      return { success: false, reason: 'position_exists' }
    }
    const { executedPrice, fee } = this.simulateExecution(p.side, p.entry, p.size)
    this.balance -= fee
    this.positions.set(p.symbol, { ...p, entry: executedPrice })
    this.totalTrades++
    return { success: true, executedPrice, fee }
  }

  closePosition(symbol: string, price: number) {
    const pos = this.positions.get(symbol)
    if (!pos) return { success: false, reason: 'no_position' }
    const { executedPrice, fee } = this.simulateExecution(pos.side === 'buy' ? 'sell' : 'buy', price, pos.size)
    const pnl = pos.side === 'buy' ? (executedPrice - pos.entry) * pos.size : (pos.entry - executedPrice) * pos.size
    this.balance += pnl - fee
    this.totalPnl += pnl - fee
    if (pnl > fee) this.wins++
    this.positions.delete(symbol)
    return { success: true, pnl: pnl - fee, executedPrice, fee }
  }
  
  checkTriggers(symbol: string, price: number) {
    const pos = this.positions.get(symbol)
    if (!pos) return false
    const hitTp = pos.tp && (pos.side === 'buy' ? price >= pos.tp : price <= pos.tp)
    const hitSl = pos.sl && (pos.side === 'buy' ? price <= pos.sl : price >= pos.sl)
    if (hitTp || hitSl) {
      this.closePosition(symbol, price)
      return true
    }
    return false
  }

  getStats() {
    const openPositions = this.positions.size
    const winRate = this.totalTrades ? this.wins / this.totalTrades : 0
    return {
      balance: this.balance,
      initialBalance: this.initialBalance,
      totalPnl: this.totalPnl,
      totalPnlPercent: this.totalPnl / this.initialBalance,
      openPositions,
      totalTrades: this.totalTrades,
      winRate,
    }
  }
}

let singleton: PaperManager | null = null
export function getPaperManager() {
  if (!singleton) singleton = new PaperManager()
  return singleton
}


