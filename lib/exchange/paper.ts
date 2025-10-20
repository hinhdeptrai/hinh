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

  openPosition(p: PaperPosition) {
    if (this.positions.has(p.symbol)) {
      return { success: false, reason: 'position_exists' }
    }
    this.positions.set(p.symbol, p)
    this.totalTrades++
    return { success: true }
  }

  closePosition(symbol: string, price: number) {
    const pos = this.positions.get(symbol)
    if (!pos) return { success: false, reason: 'no_position' }
    const pnl = pos.side === 'buy' ? (price - pos.entry) * pos.size : (pos.entry - price) * pos.size
    this.balance += pnl
    this.totalPnl += pnl
    if (pnl > 0) this.wins++
    this.positions.delete(symbol)
    return { success: true, pnl }
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


