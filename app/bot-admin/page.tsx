'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type SystemStatus = {
  mode: string
  balance: number
  dailyLoss: {
    dailyPnl: number
    maxLoss: number
    remaining: number
    canTrade: boolean
  }
  openPositions: number
  positions: any[]
}

type TradeLog = {
  timestamp: number
  symbol: string
  action: string
  side: string
  price: number
  size: number
  orderId: string
  pnl?: number
}

export default function BotAdminPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [logs, setLogs] = useState<TradeLog[]>([])
  const [queueStats, setQueueStats] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/system-status')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }

  const fetchQueueStats = async () => {
    try {
      const res = await fetch('/api/queue-status')
      const data = await res.json()
      setQueueStats(data)
    } catch (err) {
      console.error('Failed to fetch queue stats:', err)
    }
  }

  const processQueue = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/process-signal-queue')
      const data = await res.json()
      alert(`Processed: ${data.processed}, Failed: ${data.failed}`)
      fetchStatus()
      fetchQueueStats()
    } catch (err) {
      alert('Failed to process queue')
    } finally {
      setLoading(false)
    }
  }

  const resetFailedSignals = async () => {
    if (!confirm('Reset all FAILED signals back to PENDING?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/reset-failed-signals', { method: 'POST' })
      const data = await res.json()
      alert(`Reset ${data.affected?.affectedRows || 0} signals`)
      fetchQueueStats()
    } catch (err) {
      alert('Failed to reset signals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchQueueStats()
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchStatus()
        fetchQueueStats()
      }, 10000) // 10s
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (!status) return <div className="p-8">Loading...</div>

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🤖 Bot Admin Dashboard</h1>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Auto Refresh (10s)</span>
          </label>
          <Button onClick={fetchStatus} variant="outline" size="sm">
            🔄 Refresh
          </Button>
          <Button onClick={processQueue} disabled={loading} size="sm">
            {loading ? '⏳ Processing...' : '⚡ Process Queue Now'}
          </Button>
          {queueStats?.stats?.failed > 0 && (
            <Button onClick={resetFailedSignals} disabled={loading} variant="outline" size="sm">
              🔄 Reset Failed
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Mode</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {status.mode}
            <Badge variant={status.mode === 'PAPER' ? 'secondary' : 'destructive'}>
              {status.mode === 'PAPER' ? '🧪 Test' : '⚠️ Live'}
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-2xl font-bold text-green-600">
            ${status.balance.toFixed(2)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-500">Daily PnL</div>
          <div className={`text-2xl font-bold ${status.dailyLoss.dailyPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {status.dailyLoss.dailyPnl >= 0 ? '+' : ''}{status.dailyLoss.dailyPnl.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            Limit: {status.dailyLoss.maxLoss.toFixed(2)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-500">Open Positions</div>
          <div className="text-2xl font-bold text-blue-600">
            {status.openPositions}
          </div>
          <Badge variant={status.dailyLoss.canTrade ? 'default' : 'destructive'}>
            {status.dailyLoss.canTrade ? '✅ Can Trade' : '🛑 Blocked'}
          </Badge>
        </Card>
      </div>

      {/* Queue Stats */}
      {queueStats && (
        <Card className="p-4">
          <h2 className="text-xl font-bold mb-3">📊 Queue Status</h2>
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-xl font-bold">{queueStats.stats?.total || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Pending</div>
              <div className="text-xl font-bold text-yellow-600">{queueStats.stats?.pending || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Ready</div>
              <div className="text-xl font-bold text-blue-600">{queueStats.stats?.ready_to_process || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Processed</div>
              <div className="text-xl font-bold text-green-600">{queueStats.stats?.processed || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Failed</div>
              <div className="text-xl font-bold text-red-600">{queueStats.stats?.failed || 0}</div>
            </div>
          </div>

          {/* Queue Details Table */}
          {queueStats.signals && queueStats.signals.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold mb-2">Queue Details</h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Symbol</th>
                      <th className="text-left p-2">TF</th>
                      <th className="text-left p-2">Side</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Ready</th>
                      <th className="text-right p-2">Minutes</th>
                      <th className="text-left p-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueStats.signals.map((sig: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{sig.symbol}</td>
                        <td className="p-2">{sig.timeframe}</td>
                        <td className="p-2">
                          <Badge variant={sig.signal_type === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                            {sig.signal_type}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant={
                              sig.status === 'PROCESSED' ? 'default' : 
                              sig.status === 'FAILED' ? 'destructive' : 
                              'secondary'
                            }
                            className="text-xs"
                          >
                            {sig.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {sig.ready_status === 'READY' ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="text-yellow-600">⏳</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {sig.minutes_until_close > 0 ? (
                            <span className="text-yellow-600">+{sig.minutes_until_close}m</span>
                          ) : (
                            <span className="text-green-600">{Math.abs(sig.minutes_until_close).toFixed(0)}m ago</span>
                          )}
                        </td>
                        <td className="p-2 text-xs text-red-600 truncate max-w-xs">
                          {sig.error_message || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Open Positions */}
      {status.positions.length > 0 && (
        <Card className="p-4">
          <h2 className="text-xl font-bold mb-3">📍 Open Positions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-right p-2">Entry</th>
                  <th className="text-right p-2">Size</th>
                  <th className="text-right p-2">TP</th>
                  <th className="text-right p-2">SL</th>
                </tr>
              </thead>
              <tbody>
                {status.positions.map((pos, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono">{pos.symbol}</td>
                    <td className="p-2">
                      <Badge variant={pos.side === 'buy' ? 'default' : 'destructive'}>
                        {pos.side.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2 text-right font-mono">{pos.entry?.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{pos.size?.toFixed(4)}</td>
                    <td className="p-2 text-right font-mono text-green-600">{pos.tp?.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono text-red-600">{pos.sl?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Trade Logs */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-3">📝 Recent Activity</h2>
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No recent activity</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {log.action === 'entry' ? '🟢' : log.action === 'tp' ? '✅' : log.action === 'sl' ? '🛑' : '🔵'}
                  </span>
                  <div>
                    <div className="font-mono font-bold">{log.symbol}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Badge>{log.action.toUpperCase()}</Badge>
                  <Badge variant={log.side === 'buy' ? 'default' : 'destructive'}>
                    {log.side.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-mono">{log.size} @ {log.price}</div>
                  {log.pnl !== undefined && (
                    <div className={`text-sm font-bold ${log.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      PnL: {log.pnl >= 0 ? '+' : ''}{log.pnl.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Config Info */}
      <Card className="p-4">
        <h2 className="text-xl font-bold mb-3">⚙️ Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Risk per Trade</div>
            <div className="font-bold">0.5%</div>
          </div>
          <div>
            <div className="text-gray-500">Leverage</div>
            <div className="font-bold">5x</div>
          </div>
          <div>
            <div className="text-gray-500">Max Positions</div>
            <div className="font-bold">3</div>
          </div>
          <div>
            <div className="text-gray-500">Cooldown</div>
            <div className="font-bold">5 min</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

