'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BotStatus, Signal, Position, WinRateStats, TradeHistory } from '@/lib/bot/types'

export default function BotAdminPage() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [autoTrade, setAutoTrade] = useState(false)
  const [stats, setStats] = useState<WinRateStats | null>(null)
  const [history, setHistory] = useState<TradeHistory[]>([])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bot/status')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/bot/stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setHistory(data.history)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const scanSymbols = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bot/scan', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setSignals(data.signals)
        const message = `Auto scan & trade completed:\n` +
          `📡 Signals found: ${data.signals_found}/${data.scanned}\n` +
          `⚡ Trades executed: ${data.trades_executed}\n` +
          `💰 Check Open Positions for results`
        alert(message)
        fetchStatus() // Refresh status to show new positions
      } else {
        throw new Error(data.error || 'Scan failed')
      }
    } catch (err) {
      alert('Failed to scan symbols')
    } finally {
      setLoading(false)
    }
  }

  const tradeSignal = async (signal: Signal) => {
    setLoading(true)
    try {
      const res = await fetch('/api/bot/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signal)
      })
      const data = await res.json()
      
      if (data.success) {
        alert(`Trade executed: ${signal.symbol} ${signal.side}`)
        fetchStatus()
      } else {
        alert(`Trade failed: ${data.reason}`)
      }
    } catch (err) {
      alert('Failed to execute trade')
    } finally {
      setLoading(false)
    }
  }

  const monitorPositions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bot/monitor', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        alert(`Monitor completed: ${data.updated}/${data.checked} positions updated`)
        fetchStatus()
      }
    } catch (err) {
      alert('Failed to monitor positions')
    } finally {
      setLoading(false)
    }
  }

  const createTestSignal = async () => {
    setLoading(true)
    try {
      const testSignal: Signal = {
        symbol: 'BTCUSDT',
        timeframe: '5m',
        side: 'buy',
        entry: 50000,
        sl: 49000,
        tp: 52000,
        confidence: 0.8,
        reason: 'Test signal from UI',
        candleCloseTime: new Date().toISOString(),
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }

      const res = await fetch('/api/bot/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSignal)
      })
      const data = await res.json()
      
      if (data.success) {
        const now = new Date().toLocaleString()
        alert(`Test signal executed: ${testSignal.symbol} ${testSignal.side} at ${now}`)
        fetchStatus()
      } else {
        alert(`Test signal failed: ${data.reason}`)
      }
    } catch (err) {
      alert('Failed to create test signal')
    } finally {
      setLoading(false)
    }
  }

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchStatus()
        fetchStats()
      }, 5000) // Refresh every 5 seconds for real-time updates
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Initial load
  useEffect(() => {
    fetchStatus()
    fetchStats()
  }, [])

  if (!status) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">🤖 Bot Admin</h1>
        
        <div className="flex gap-4 items-center mb-6">
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
          <Button onClick={scanSymbols} disabled={loading} size="sm">
            🔍 Scan Symbols
          </Button>
          <Button onClick={monitorPositions} disabled={loading} variant="outline" size="sm">
            📊 Monitor Positions
          </Button>
          <Button onClick={createTestSignal} disabled={loading} variant="secondary" size="sm">
            🧪 Test Signal
          </Button>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoTrade}
              onChange={(e) => setAutoTrade(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">🤖 Auto Trade</span>
          </label>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
          <div className="text-2xl font-bold">
            ${status.balance.toFixed(2)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-500">Daily PnL</div>
          <div className={`text-2xl font-bold ${status.dailyPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {status.dailyPnl >= 0 ? '+' : ''}${status.dailyPnl.toFixed(2)}
          </div>
          {status.positions.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Open: {status.positions.reduce((sum, p) => sum + (p.pnl || 0), 0).toFixed(2)}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-500">Open Positions</div>
          <div className="text-2xl font-bold">
            {status.openPositions}
          </div>
        </Card>
      </div>

      {/* Win Rate Stats */}
      {stats && stats.totalTrades > 0 && (
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📊 Win Rate Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.winRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalTrades}</div>
              <div className="text-sm text-gray-500">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.winningTrades}</div>
              <div className="text-sm text-gray-500">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.losingTrades}</div>
              <div className="text-sm text-gray-500">Losses</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total PnL:</span>
              <span className={`ml-2 font-medium ${stats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Avg Win:</span>
              <span className="ml-2 font-medium text-green-600">${stats.averageWin.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500">Avg Loss:</span>
              <span className="ml-2 font-medium text-red-600">${stats.averageLoss.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📡 Signals Found</h2>
          <div className="space-y-2">
            {signals.map((signal, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{signal.symbol}</span>
                  <Badge variant={signal.side === 'buy' ? 'default' : 'destructive'} className="ml-2">
                    {signal.side.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500 ml-2">
                    Entry: ${signal.entry.toFixed(2)} | SL: ${signal.sl.toFixed(2)} | TP: ${signal.tp.toFixed(2)}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    Confidence: {(signal.confidence * 100).toFixed(1)}% | 
                    Closes: {new Date(signal.candleCloseTime).toLocaleTimeString()}
                  </div>
                </div>
                <Button 
                  onClick={() => tradeSignal(signal)} 
                  disabled={loading}
                  size="sm"
                >
                  Trade
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Positions */}
      {status.positions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">📈 Open Positions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-left p-2">Size</th>
                  <th className="text-left p-2">Entry</th>
                  <th className="text-left p-2">Current</th>
                  <th className="text-left p-2">PnL</th>
                  <th className="text-left p-2">SL</th>
                  <th className="text-left p-2">TP</th>
                  <th className="text-left p-2">Opened</th>
                </tr>
              </thead>
              <tbody>
                {status.positions.map((position, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{position.symbol}</td>
                    <td className="p-2">
                      <Badge variant={position.side === 'buy' ? 'default' : 'destructive'}>
                        {position.side.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2">{position.size.toFixed(4)}</td>
                    <td className="p-2">${position.entryPrice.toFixed(2)}</td>
                    <td className="p-2">
                      <div className="font-medium">${position.currentPrice.toFixed(2)}</div>
                      <div className={`text-xs ${position.currentPrice > position.entryPrice ? 'text-green-600' : 'text-red-600'}`}>
                        {position.currentPrice > position.entryPrice ? '↗' : '↘'} 
                        {((position.currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(2)}%
                      </div>
                    </td>
                    <td className={`p-2 font-medium ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div>{position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}</div>
                      <div className="text-xs">
                        {position.pnl >= 0 ? '🟢 WIN' : '🔴 LOSS'}
                      </div>
                    </td>
                    <td className="p-2">${position.sl.toFixed(2)}</td>
                    <td className="p-2">${position.tp.toFixed(2)}</td>
                    <td className="p-2 text-xs text-gray-500">
                      {new Date(position.openedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {status.positions.length === 0 && signals.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">🤖</div>
            <div className="text-lg">No signals or positions</div>
            <div className="text-sm">Click "Scan Symbols" to find trading opportunities</div>
          </div>
        </Card>
      )}
    </div>
  )
}
