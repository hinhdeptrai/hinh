export function updateTrailingStop(params: {
  side: 'buy' | 'sell'
  currentPrice: number
  entry: number
  trailPercent: number
  currentSl: number
}): number {
  const { side, currentPrice, entry, trailPercent, currentSl } = params
  const isProfitable = side === 'buy' ? currentPrice > entry : currentPrice < entry
  if (!isProfitable) return currentSl
  const newStop = side === 'buy' ? currentPrice * (1 - trailPercent) : currentPrice * (1 + trailPercent)
  const shouldUpdate = side === 'buy' ? newStop > currentSl : newStop < currentSl
  return shouldUpdate ? newStop : currentSl
}

export function computePartialExits(totalSize: number, exitPercents: number[]): number[] {
  return exitPercents.map(p => Math.max(0, totalSize * p))
}

export function validateTpSlLevels(params: {
  side: 'buy' | 'sell'
  entry: number
  sl: number
  tpLevels: number[]
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const { side, entry, sl, tpLevels } = params
  if (side === 'buy' && sl >= entry) errors.push('SL must be below entry for long')
  if (side === 'sell' && sl <= entry) errors.push('SL must be above entry for short')
  for (const tp of tpLevels) {
    if (side === 'buy' && tp <= entry) errors.push(`TP ${tp} must be above entry ${entry} for long`)
    if (side === 'sell' && tp >= entry) errors.push(`TP ${tp} must be below entry ${entry} for short`)
  }
  const slDist = Math.abs(entry - sl)
  const firstTpDist = Math.abs((tpLevels[0] ?? entry) - entry)
  const rr = slDist > 0 ? firstTpDist / slDist : 0
  if (rr < 1) errors.push(`Risk/Reward ratio ${rr.toFixed(2)} is less than 1:1`)
  return { valid: errors.length === 0, errors }
}


