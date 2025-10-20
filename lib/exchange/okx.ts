import crypto from 'crypto'
import { throttle, withBackoff } from './rate'
import { getConfig } from './config'
import { getPaperManager } from './paper'

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

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 100 // ms

export async function okxFetch(path: string, method: 'GET' | 'POST', body?: any) {
  // Sliding-window rate limiter
  await throttle(60, 2000)

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

  const res = await withBackoff(() => fetch(url, {
    method,
    headers,
    body: bodyStr || undefined,
  }))
  const json = await withBackoff(() => res.json().catch(() => ({})))
  if (!res.ok || json?.code && json.code !== '0') {
    const msg = json?.msg || res.statusText
    throw new Error(`OKX API error: ${res.status} ${msg} (${JSON.stringify(json)})`)
  }
  return json
}

// ----- Instruments metadata (tick size, lot size, contract value) -----
type InstrumentMeta = { tickSz: number; lotSz: number; ctVal?: number }
type CachedMeta = { meta: InstrumentMeta; timestamp: number }
const instrumentCache = new Map<string, CachedMeta>()
const CACHE_TTL = 3600000 // 1 hour

function parseStepSize(stepStr: string): number {
  // e.g. '0.001' -> decimals 3; '1' -> 0
  if (!stepStr.includes('.')) return 0
  const [, dec] = stepStr.split('.')
  return dec.replace(/0+$/, '').length || dec.length
}

export async function getInstrumentMeta(instId: string): Promise<InstrumentMeta> {
  const cached = instrumentCache.get(instId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.meta
  const resp = await okxFetch(`/api/v5/public/instruments?instType=SWAP&instId=${encodeURIComponent(instId)}`, 'GET')
  const item = resp?.data?.[0]
  const tickSzStr = item?.tickSz ?? '0.01'
  const lotSzStr = item?.lotSz ?? '0.001'
  const ctValNum = item?.ctVal ? Number(item.ctVal) : undefined
  const meta: InstrumentMeta = {
    tickSz: parseStepSize(String(tickSzStr)),
    lotSz: parseStepSize(String(lotSzStr)),
    ctVal: Number.isFinite(ctValNum as number) ? ctValNum : undefined,
  }
  instrumentCache.set(instId, { meta, timestamp: Date.now() })
  return meta
}

export function quantizeByDecimals(value: number, decimals: number): number {
  const f = Math.pow(10, decimals)
  return Math.floor(value * f) / f
}

export async function quantizePriceAndSize(symbol: string, price?: number, size?: number): Promise<{ price?: number; size?: number }> {
  const instId = toOkxInstId(symbol)
  const meta = await getInstrumentMeta(instId)
  const qPrice = typeof price === 'number' ? quantizeByDecimals(price, meta.tickSz) : undefined
  let qSize = size
  if (typeof size === 'number') {
    if (meta.ctVal) {
      const contracts = size / meta.ctVal
      qSize = quantizeByDecimals(contracts, meta.lotSz)
    } else {
      qSize = quantizeByDecimals(size, meta.lotSz)
    }
  }
  return { price: qPrice, size: qSize }
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
  const q = await quantizePriceAndSize(params.symbol, params.price, params.size)
  const body = {
    instId,
    tdMode: getEnv('OKX_TD_MODE', 'cross'), // cross or isolated
    side,
    ordType,
    sz: String(q.size ?? params.size),
    reduceOnly: params.reduceOnly ? 'true' : 'false',
    ...(ordType === 'limit' && (q.price ?? params.price) ? { px: String(q.price ?? params.price) } : {}),
  }
  const resp = await withBackoff(() => okxFetch('/api/v5/trade/order', 'POST', body))
  const data = resp?.data?.[0]
  return {
    success: true,
    orderId: data?.ordId || data?.clOrdId || `okx_${Date.now()}`,
  }
}

export async function fetchAccountBalanceUSDT(): Promise<number> {
  if (isPaperMode()) {
    // Return paper manager balance
    return getPaperManager().balance
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

export async function computePositionSizeByRiskAsync(params: {
  symbol: string
  balanceUSDT: number
  riskPercent: number
  entry: number
  stop: number
}): Promise<number> {
  const riskAmount = params.balanceUSDT * params.riskPercent
  const perUnitRisk = Math.max(Math.abs(params.entry - params.stop), 1e-9)
  const notional = riskAmount / perUnitRisk
  const instId = toOkxInstId(params.symbol)
  const meta = await getInstrumentMeta(instId)
  let size = notional
  if (meta.ctVal) size = notional / meta.ctVal
  return Math.max(0, quantizeByDecimals(size, meta.lotSz))
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
  // Validate TP/SL relative to entry
  if (params.tp !== undefined) {
    const isTpValid = params.side === 'buy' ? params.tp > params.entry : params.tp < params.entry
    if (!isTpValid) throw new Error(`Invalid TP: ${params.tp} for ${params.side} entry at ${params.entry}`)
  }
  const isSlValid = params.side === 'buy' ? params.sl < params.entry : params.sl > params.entry
  if (!isSlValid) throw new Error(`Invalid SL: ${params.sl} for ${params.side} entry at ${params.entry}`)
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

export async function placeMultipleTpSl(params: {
  symbol: string
  side: 'buy' | 'sell'
  entry: number
  sl: number
  totalSize: number
  tpLevels: Array<{ price: number; sizePercent: number }>
}): Promise<{ success: boolean; algoIds: string[] }>{
  const instId = toOkxInstId(params.symbol)
  const closeSide: 'buy' | 'sell' = params.side === 'buy' ? 'sell' : 'buy'
  const algoIds: string[] = []
  // SL for full position
  const slBody = {
    instId,
    tdMode: getEnv('OKX_TD_MODE', 'cross'),
    side: closeSide,
    ordType: 'conditional',
    sz: String(params.totalSize),
    slTriggerPx: String(params.sl),
    slOrdPx: '-1',
  }
  const slRes = await okxFetch('/api/v5/trade/order-algo', 'POST', slBody)
  algoIds.push(slRes?.data?.[0]?.algoId)
  // Multiple TP partial closes
  for (const level of params.tpLevels) {
    const tpSz = params.totalSize * level.sizePercent
    const tpBody = {
      instId,
      tdMode: getEnv('OKX_TD_MODE', 'cross'),
      side: closeSide,
      ordType: 'conditional',
      sz: String(tpSz),
      tpTriggerPx: String(level.price),
      tpOrdPx: '-1',
    }
    const tpRes = await okxFetch('/api/v5/trade/order-algo', 'POST', tpBody)
    algoIds.push(tpRes?.data?.[0]?.algoId)
  }
  return { success: true, algoIds }
}

export function getLeverage(): number {
  const lev = Number(getEnv('OKX_LEVERAGE', '5'))
  const MAX_LEVERAGE = 10
  if (!Number.isFinite(lev) || lev <= 0) return 5
  return Math.min(lev, MAX_LEVERAGE)
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
  if (size > maxSize) {
    console.warn(`Order size ${size} exceeds max ${maxSize}, clamping`)
    return { ok: true, size: maxSize, reason: 'clamped_max' }
  }
  return { ok: true, size }
}

export async function getPosition(symbol: string): Promise<any> {
  if (isPaperMode()) {
    // In paper mode, we don't query real positions; return null or mock
    return null
  }
  const instId = toOkxInstId(symbol)
  const resp = await okxFetch(`/api/v5/account/positions?instId=${encodeURIComponent(instId)}`, 'GET')
  return resp?.data?.[0] || null
}

export async function closePosition(symbol: string, side: 'buy' | 'sell', size: number): Promise<ExecuteOrderResult> {
  // Close with reduceOnly market opposite side
  const opposite: 'buy' | 'sell' = side === 'buy' ? 'sell' : 'buy'
  return await placeOrder({ symbol, side: opposite, type: 'market', size, reduceOnly: true })
}


