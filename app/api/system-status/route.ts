import { NextRequest } from 'next/server'
import { getConfig } from '@/lib/exchange/config'
import { getPaperManager } from '@/lib/exchange/paper'
import { fetchAccountBalanceUSDT, okxFetch } from '@/lib/exchange/okx'
import { dailyLossLimiter } from '@/lib/exchange/risk'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const cfg = getConfig()
    const mode = cfg.paper ? 'PAPER' : 'LIVE'
    const loss = dailyLossLimiter.getStatus()
    let balance = await fetchAccountBalanceUSDT()
    let positions: any[] = []
    if (!cfg.paper) {
      const resp = await okxFetch('/api/v5/account/positions', 'GET')
      positions = resp?.data?.filter((p: any) => Number(p.pos || p.sz) !== 0) || []
    } else {
      const pm = getPaperManager()
      positions = Array.from(pm.positions.values())
      balance = pm.balance
    }
    return Response.json({ mode, balance, dailyLoss: loss, openPositions: positions.length, positions }, { status: 200 })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


