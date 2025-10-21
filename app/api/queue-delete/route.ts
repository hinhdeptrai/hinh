import { NextRequest } from "next/server"
import { deletePendingQueueSignals } from "@/lib/db"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || ''
    const timeframe = searchParams.get('timeframe') || undefined
    if (!symbol) {
      return Response.json({ error: 'symbol is required' }, { status: 400 })
    }
    const result: any = await deletePendingQueueSignals(symbol, timeframe)
    return Response.json({ success: true, symbol, timeframe, affectedRows: result?.affectedRows ?? null }, { status: 200 })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


