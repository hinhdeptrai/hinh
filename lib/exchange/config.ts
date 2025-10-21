export type AppConfig = {
  paper: boolean
  demoHeader: boolean
  leverage: number
  defaultRiskPercent: number
  maxPositionSize: number
  minOrderSize: number
  maxEquityPerTrade: number
  symbolWhitelist: string[]
}

function env(key: string, fallback?: string): string | undefined {
  const v = process.env[key]
  return (v === undefined || v === '') ? fallback : v
}

export function getEnv(key: string, fallback?: string): string {
  const v = process.env[key]
  return (v === undefined || v === '') ? (fallback || '') : v
}

export function getConfig(): AppConfig {
  const paper = (env('OKX_PAPER', 'true') === 'true')
  const demoHeader = env('OKX_DEMO', paper ? '1' : '0') === '1'
  const lev = Number(env('OKX_LEVERAGE', '5'))
  const leverage = Number.isFinite(lev) ? Math.min(Math.max(lev, 1), 10) : 5
  const defaultRiskPercent = Number(env('DEFAULT_RISK_PERCENT', '0.01'))
  const maxPositionSize = Number(env('MAX_POSITION_SIZE', '1000000'))
  const minOrderSize = Number(env('MIN_ORDER_SIZE', '0.001'))
  const maxEquityPerTrade = Number(env('MAX_EQUITY_PER_TRADE', '1'))
  const symbolWhitelist = (env('TRADE_SYMBOL_WHITELIST', 'BTCUSDT,ETHUSDT') || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  return {
    paper,
    demoHeader,
    leverage,
    defaultRiskPercent,
    maxPositionSize,
    minOrderSize,
    maxEquityPerTrade,
    symbolWhitelist,
  }
}


