// Bot Types
export interface BotConfig {
  mode: 'paper' | 'live'
  leverage: number
  riskPercent: number
  maxPositions: number
  symbolWhitelist: string[]
  cooldownMinutes: number
  dailyLossLimit: number
}

export interface Signal {
  id?: number
  symbol: string
  timeframe: string
  side: 'buy' | 'sell'
  entry: number
  sl: number
  tp: number
  confidence: number
  reason: string
  candleCloseTime: string
  status: 'PENDING' | 'PROCESSED' | 'FAILED'
  createdAt: string
}

export interface Position {
  symbol: string
  side: 'buy' | 'sell'
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  sl: number
  tp: number
  orderId: string
  algoId?: string
  openedAt: string
}

export interface BotStatus {
  mode: string
  balance: number
  dailyPnl: number
  openPositions: number
  positions: Position[]
  canTrade: boolean
  lastUpdate: string
}

export interface TradeLog {
  timestamp: number
  symbol: string
  action: string
  side: string
  price: number
  size: number
  pnl?: number
  reason: string
}

export interface TradeHistory {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  entryPrice: number
  exitPrice?: number
  size: number
  pnl?: number
  outcome?: 'win' | 'loss' | 'breakeven'
  openedAt: string
  closedAt?: string
  reason: string
}

export interface WinRateStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakevenTrades: number
  winRate: number
  totalPnl: number
  averageWin: number
  averageLoss: number
  profitFactor: number
}
