import { BotConfig } from './types'

export function getBotConfig(): BotConfig {
  return {
    mode: process.env.OKX_PAPER === 'true' ? 'paper' : 'live',
    leverage: Math.min(Number(process.env.OKX_LEVERAGE || '5'), 10),
    riskPercent: Number(process.env.DEFAULT_RISK_PERCENT || '0.5'),
    maxPositions: 3,
    symbolWhitelist: (process.env.TRADE_SYMBOL_WHITELIST || 'BTCUSDT,ETHUSDT')
      .split(',')
      .map(s => s.trim().toUpperCase()),
    cooldownMinutes: 5,
    dailyLossLimit: 5
  }
}

export function isPaperMode(): boolean {
  return process.env.OKX_PAPER === 'true'
}
