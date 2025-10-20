let timestamps: number[] = []

export function allowRequest(maxPerWindow = 60, windowMs = 2000) {
  const now = Date.now()
  // Drop old
  timestamps = timestamps.filter(t => now - t < windowMs)
  if (timestamps.length < maxPerWindow) {
    timestamps.push(now)
    return { allowed: true, waitMs: 0 }
  }
  const earliest = timestamps[0]
  const waitMs = windowMs - (now - earliest)
  return { allowed: false, waitMs }
}

export async function throttle(maxPerWindow = 60, windowMs = 2000) {
  const r = allowRequest(maxPerWindow, windowMs)
  if (!r.allowed && r.waitMs > 0) {
    await new Promise(rsl => setTimeout(rsl, r.waitMs))
  }
}

export async function withBackoff<T>(fn: () => Promise<T>, retries = 3) {
  let attempt = 0
  let delay = 200
  while (true) {
    try {
      return await fn()
    } catch (e: any) {
      attempt++
      if (attempt > retries) throw e
      await new Promise(r => setTimeout(r, delay))
      delay = Math.min(delay * 2, 2000)
    }
  }
}


