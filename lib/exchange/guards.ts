const DEFAULT_WHITELIST = (process.env.TRADE_SYMBOL_WHITELIST ?? 'BTCUSDT,ETHUSDT').split(',').map(s => s.trim()).filter(Boolean)
const MAX_POSITION_SIZE = Number(process.env.MAX_POSITION_SIZE ?? '1000000')

export function isSymbolWhitelisted(symbol: string): boolean {
  return DEFAULT_WHITELIST.includes(symbol)
}

export function clampSize(size: number): number {
  if (!Number.isFinite(size) || size <= 0) return 0
  return Math.min(size, MAX_POSITION_SIZE)
}

export function normalizeSide(signalType: 'BUY' | 'SELL' | 'NONE'): 'buy' | 'sell' | null {
  if (signalType === 'BUY') return 'buy'
  if (signalType === 'SELL') return 'sell'
  return null
}


