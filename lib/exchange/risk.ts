import { getConfig } from './config'
import { getPaperManager } from './paper'
import { okxFetch, fetchAccountBalanceUSDT, getPosition } from './okx'

export class CooldownManager {
  private lastTrades = new Map<string, number>()

  canTrade(symbol: string, cooldownMs = 300000): boolean {
    const lastTime = this.lastTrades.get(symbol) || 0
    const elapsed = Date.now() - lastTime
    return elapsed >= cooldownMs
  }

  recordTrade(symbol: string) {
    this.lastTrades.set(symbol, Date.now())
  }

  getRemainingCooldown(symbol: string, cooldownMs = 300000): number {
    const lastTime = this.lastTrades.get(symbol) || 0
    const elapsed = Date.now() - lastTime
    return Math.max(0, cooldownMs - elapsed)
  }
}

export const cooldownManager = new CooldownManager()

export class DailyLossLimiter {
  private dailyPnl = 0
  private lastResetDate = new Date().toDateString()
  private readonly maxDailyLoss: number

  constructor(maxDailyLossPercent = 0.05) {
    const cfg = getConfig()
    const base = getPaperManager().initialBalance
    this.maxDailyLoss = base * maxDailyLossPercent
  }

  private checkNewDay() {
    const today = new Date().toDateString()
    if (today !== this.lastResetDate) {
      this.dailyPnl = 0
      this.lastResetDate = today
    }
  }

  recordPnl(pnl: number) {
    this.checkNewDay()
    this.dailyPnl += pnl
  }

  canTrade(): boolean {
    this.checkNewDay()
    return this.dailyPnl > -this.maxDailyLoss
  }

  getStatus() {
    this.checkNewDay()
    return {
      dailyPnl: this.dailyPnl,
      maxLoss: this.maxDailyLoss,
      remaining: this.maxDailyLoss + this.dailyPnl,
      canTrade: this.canTrade(),
    }
  }
}

export const dailyLossLimiter = new DailyLossLimiter()

export async function checkMaxPositions(maxPositions = 3): Promise<boolean> {
  const cfg = getConfig()
  if (cfg.paper) {
    const pm = getPaperManager()
    return pm.positions.size < maxPositions
  }
  try {
    const resp = await okxFetch('/api/v5/account/positions', 'GET')
    const positions = resp?.data || []
    const openPositions = positions.filter((p: any) => Number(p.pos || p.sz) !== 0)
    return openPositions.length < maxPositions
  } catch {
    // If cannot fetch, be safe: disallow
    return false
  }
}


