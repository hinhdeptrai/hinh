import { sendTelegramMessage } from '@/lib/telegram'

interface TradeLog {
  timestamp: number
  symbol: string
  action: 'entry' | 'tp' | 'sl' | 'close'
  side: 'buy' | 'sell'
  price: number
  size: number
  orderId: string
  pnl?: number
}

class TradeLogger {
  private logs: TradeLog[] = []

  log(entry: TradeLog): void {
    this.logs.push(entry)
    const ts = new Date(entry.timestamp).toISOString()
    const pnlStr = entry.pnl !== undefined ? ` PNL: ${entry.pnl.toFixed(2)}` : ''
    console.log(`[TRADE] ${ts} - ${entry.action.toUpperCase()} ${entry.side.toUpperCase()} ${entry.size} ${entry.symbol} @ ${entry.price}${pnlStr}`)
  }

  async logWithAlert(entry: TradeLog, alertCritical = false): Promise<void> {
    this.log(entry)
    const pnlStr = entry.pnl !== undefined ? ` | PNL: <b>${entry.pnl > 0 ? '+' : ''}${entry.pnl.toFixed(2)} USDT</b>` : ''
    const emoji = entry.action === 'entry' ? '🟢' : entry.action === 'tp' ? '✅' : entry.action === 'sl' ? '🛑' : '🔵'
    const msg = `${emoji} <b>${entry.action.toUpperCase()}</b>\n${entry.side.toUpperCase()} ${entry.size} <code>${entry.symbol}</code> @ <code>${entry.price}</code>${pnlStr}\nOrder: <code>${entry.orderId}</code>`
    
    if (alertCritical || entry.action === 'sl' || (entry.pnl !== undefined && Math.abs(entry.pnl) > 50)) {
      try {
        await sendTelegramMessage(msg)
      } catch (err) {
        console.error('Failed to send Telegram alert:', err)
      }
    }
  }

  getPerformance(symbol?: string): { totalTrades: number; winRate: number; totalPnl: number } {
    const filtered = symbol ? this.logs.filter(l => l.symbol === symbol) : this.logs
    const closedTrades = filtered.filter(l => l.pnl !== undefined)
    const wins = closedTrades.filter(l => (l.pnl ?? 0) > 0)
    return {
      totalTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? wins.length / closedTrades.length : 0,
      totalPnl: closedTrades.reduce((sum, l) => sum + (l.pnl ?? 0), 0)
    }
  }

  getRecentLogs(limit = 20): TradeLog[] {
    return this.logs.slice(-limit)
  }
}

let singleton: TradeLogger | null = null
export function getTradeLogger() {
  if (!singleton) singleton = new TradeLogger()
  return singleton
}

