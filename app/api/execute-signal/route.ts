import { NextRequest } from 'next/server'
import { fetchAccountBalanceUSDT, placeOrder, computePositionSizeByRisk } from '@/lib/exchange/okx'

type Body = {
  symbol: string
  side: 'buy' | 'sell'
  type?: 'market' | 'limit'
  entry_price?: number
  sl_price?: number
  risk_percent?: number // 0.01 = 1%
  reduce_only?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Body
    const {
      symbol,
      side,
      type = 'market',
      entry_price,
      sl_price,
      risk_percent = 0.01,
      reduce_only = false,
    } = body

    if (!symbol || !side) {
      return Response.json({ error: 'symbol and side are required' }, { status: 400 })
    }

    const paper = (process.env.OKX_PAPER ?? 'true') === 'true'

    // Sizing
    const balance = await fetchAccountBalanceUSDT()
    if (!entry_price || !sl_price) {
      // fallback fixed size if missing prices
      const result = await placeOrder({ symbol, side, type, size: 1, price: type === 'limit' ? entry_price : undefined, reduceOnly: reduce_only })
      return Response.json({ success: result.success, orderId: result.orderId, paper: result.paper ?? paper, balanceUsed: 0 })
    }

    const size = computePositionSizeByRisk({ balanceUSDT: balance, riskPercent: risk_percent, entry: entry_price, stop: sl_price })
    if (size <= 0) {
      return Response.json({ error: 'Calculated size is zero. Check entry/sl and balance.' }, { status: 400 })
    }

    const result = await placeOrder({ symbol, side, type, size, price: type === 'limit' ? entry_price : undefined, reduceOnly: reduce_only })
    return Response.json({ success: result.success, orderId: result.orderId, paper: result.paper ?? paper, size, balance })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


