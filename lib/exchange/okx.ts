import crypto from 'crypto'

type OrderSide = 'buy' | 'sell'
type OrderType = 'market' | 'limit'

export type ExecuteOrderParams = {
  symbol: string // e.g. BTCUSDT
  side: OrderSide // buy/sell
  type: OrderType // market/limit
  size: number // in contracts or base size depending on instId
  price?: number // required for limit
  reduceOnly?: boolean
}

export type ExecuteOrderResult = {
  success: boolean
  orderId?: string
  message?: string
  paper?: boolean
}

export type TpSlParams = {
  symbol: string
  side: 'buy' | 'sell'
  entry: number
  sl: number
  tp?: number // primary TP level
}

function getEnv(key: string, fallback?: string): string | undefined {
  const v = process.env[key]
  return (v === undefined || v === '') ? fallback : v
}

function isPaperMode(): boolean {
  return getEnv('OKX_PAPER', 'true') === 'true'
}

// Convert internal symbol (e.g. BTCUSDT) to OKX instId (e.g. BTC-USDT-SWAP)
export function toOkxInstId(symbol: string): string {
  if (symbol.includes('-')) return symbol
  const base = symbol.replace(/USDT$/i, 'USDT')
  if (base.endsWith('USDT')) return `${base.slice(0, -4)}-USDT-SWAP`
  // fallback spot
  return `${symbol.slice(0, 3)}-${symbol.slice(3)}-SWAP`
}

function okxTimestamp(): string {
  return new Date().toISOString()
}

function sign(message: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
}

async function okxFetch(path: string, method: 'GET' | 'POST', body?: any) {
  const apiKey = getEnv('OKX_API_KEY')
  const apiSecret = getEnv('OKX_API_SECRET')
  const passphrase = getEnv('OKX_API_PASSPHRASE')
  const useDemo = getEnv('OKX_DEMO', isPaperMode() ? '1' : '0') // 1 for demo trading

  if (!apiKey || !apiSecret || !passphrase) {
    throw new Error('OKX credentials missing: set OKX_API_KEY, OKX_API_SECRET, OKX_API_PASSPHRASE')
  }

  const host = 'https://www.okx.com'
  const url = host + path
  const ts = okxTimestamp()
  const bodyStr = body ? JSON.stringify(body) : ''
  const prehash = `${ts}${method}${path}${bodyStr}`
  const signature = sign(prehash, apiSecret)

  const headers: Record<string, string> = {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': ts,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  }
  if (useDemo === '1') headers['x-simulated-trading'] = '1'

  const res = await fetch(url, {
    method,
    headers,
    body: bodyStr || undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.code && json.code !== '0') {
    const msg = json?.msg || res.statusText
    throw new Error(`OKX API error: ${res.status} ${msg} (${JSON.stringify(json)})`)
  }
  return json
}

export async function placeOrder(params: ExecuteOrderParams): Promise<ExecuteOrderResult> {
  const instId = toOkxInstId(params.symbol)
  const side: 'buy' | 'sell' = params.side
  const ordType: 'market' | 'limit' = params.type
  const paper = isPaperMode()

  // Paper mode: return mocked order without hitting network
  if (paper) {
    return {
      success: true,
      orderId: `paper_${Date.now()}`,
      message: `Paper ${ordType} ${side} ${params.size} ${instId}`,
      paper: true,
    }
  }

  // Real mode: call OKX create order
  const body = {
    instId,
    tdMode: getEnv('OKX_TD_MODE', 'cross'), // cross or isolated
    side,
    ordType,
    sz: String(params.size),
    reduceOnly: params.reduceOnly ? 'true' : 'false',
    ...(ordType === 'limit' && params.price ? { px: String(params.price) } : {}),
  }
  const resp = await okxFetch('/api/v5/trade/order', 'POST', body)
  const data = resp?.data?.[0]
  return {
    success: true,
    orderId: data?.ordId || data?.clOrdId || `okx_${Date.now()}`,
  }
}

export async function fetchAccountBalanceUSDT(): Promise<number> {
  if (isPaperMode()) {
    const paperBalance = Number(getEnv('OKX_PAPER_BALANCE', '1000'))
    return paperBalance
  }
  const resp = await okxFetch('/api/v5/account/balance', 'GET')
  const details = resp?.data?.[0]?.details || []
  const usdt = details.find((d: any) => d.ccy === 'USDT')
  return Number(usdt?.cashBal || usdt?.eq || 0)
}

export function computePositionSizeByRisk(params: {
  balanceUSDT: number
  riskPercent: number // e.g. 0.01 for 1%
  entry: number
  stop: number
}): number {
  const riskAmount = params.balanceUSDT * params.riskPercent
  const perUnitRisk = Math.max(Math.abs(params.entry - params.stop), 1e-9)
  const size = riskAmount / perUnitRisk
  return Math.max(0, Math.floor(size * 1000) / 1000) // round down 0.001
}

export function computeTpSlPrices(params: {
  side: 'buy' | 'sell'
  entry: number
  sl: number
  tpPercents?: number[]
}): { takeProfits: number[]; stopLoss: number } {
  const { side, entry, sl } = params
  const levels = params.tpPercents ?? [0.005, 0.01, 0.02, 0.03, 0.075, 0.165]
  const takeProfits = levels.map(p => side === 'buy' ? entry * (1 + p) : entry * (1 - p))
  return { takeProfits, stopLoss: sl }
}

// Place TP/SL via OKX algo order (single leg with tp+sl triggers)
export async function placePrimaryTpSl(params: TpSlParams & { size: number }): Promise<{ success: boolean; algoId?: string; paper?: boolean }>{
  const instId = toOkxInstId(params.symbol)
  const paper = isPaperMode()
  const tpTriggerPx = params.tp ? String(params.tp) : undefined
  const slTriggerPx = String(params.sl)
  // TP/SL close position, side must be opposite to entry
  const closeSide: 'buy' | 'sell' = params.side === 'buy' ? 'sell' : 'buy'

  if (paper) {
    return { success: true, algoId: `paper_algo_${Date.now()}`, paper: true }
  }

  const body = {
    instId,
    tdMode: getEnv('OKX_TD_MODE', 'cross'),
    side: closeSide,
    sz: String(params.size),
    ordType: 'market' as const,
    ...(tpTriggerPx ? { tpTriggerPx, tpOrdPx: '-1' } : {}),
    slTriggerPx,
    slOrdPx: '-1',
  }
  const resp = await okxFetch('/api/v5/trade/order-algo', 'POST', body)
  const data = resp?.data?.[0]
  return { success: true, algoId: data?.algoId || `okx_algo_${Date.now()}` }
}

export function getLeverage(): number {
  const lev = Number(getEnv('OKX_LEVERAGE', '5'))
  return Number.isFinite(lev) && lev > 0 ? lev : 5
}

export function clampByLeverageNotional(params: { balanceUSDT: number; leverage: number; entry: number; size: number; maxEquityPerTrade?: number }): number {
  const { balanceUSDT, leverage, entry } = params
  const maxEquityFrac = params.maxEquityPerTrade ?? Number(getEnv('MAX_EQUITY_PER_TRADE', '1'))
  const equityCap = Math.max(0, Math.min(1, maxEquityFrac)) * balanceUSDT
  const maxNotional = Math.min(balanceUSDT * leverage, equityCap * leverage)
  if (!Number.isFinite(maxNotional) || maxNotional <= 0 || entry <= 0) return 0
  const maxSize = maxNotional / entry
  return Math.max(0, Math.min(params.size, maxSize))
}

export function validateOrderSize(size: number): { ok: boolean; size: number; reason?: string } {
  const minSize = Number(getEnv('MIN_ORDER_SIZE', '0.001'))
  const maxSize = Number(getEnv('MAX_POSITION_SIZE', '1000000'))
  if (!Number.isFinite(size) || size <= 0) return { ok: false, size: 0, reason: 'invalid_size' }
  if (size < minSize) return { ok: false, size: 0, reason: 'below_min' }
  if (size > maxSize) return { ok: true, size: maxSize, reason: 'clamped_max' }
  return { ok: true, size }
}

export async function getPosition(symbol: string): Promise<any> {
  const instId = toOkxInstId(symbol)
  const resp = await okxFetch(`/api/v5/account/positions?instId=${encodeURIComponent(instId)}`, 'GET')
  return resp?.data?.[0] || null
}

export async function closePosition(symbol: string, side: 'buy' | 'sell', size: number): Promise<ExecuteOrderResult> {
  // Close with reduceOnly market opposite side
  const opposite: 'buy' | 'sell' = side === 'buy' ? 'sell' : 'buy'
  return await placeOrder({ symbol, side: opposite, type: 'market', size, reduceOnly: true })
}


