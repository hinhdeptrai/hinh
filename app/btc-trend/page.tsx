"use client"

import { useEffect, useState } from "react"
import { AuthWrapper } from "@/components/auth-wrapper"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Target,
} from "lucide-react"

interface IndicatorResult {
  type: string
  name: string
  description: string
  winRate: number
  signal: string
  lastSignal: string
  lastSignalTime: string
  lastSignalPrice: number
  barsSinceSignal: number
  isSignalFresh: boolean
  confidence: number
  reasons: string[]
  entryLevels: {
    pos: number
    entry: number
    sl: number
    tp1: number
    tp2: number
    tp3: number
  }
  lastSignalOutcome?: string
}

interface BTCTrendData {
  success: boolean
  symbol: string
  timeframe: string
  currentPrice: number
  timestamp: string
  consensus: {
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    strength: number
    avgWinRate: number
    buyCount: number
    sellCount: number
    noneCount: number
    freshBuyCount: number
    freshSellCount: number
  }
  indicators: IndicatorResult[]
}

function BTCTrendPage() {
  const [data, setData] = useState<BTCTrendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState("4h")
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/btc-trend?timeframe=${timeframe}`)
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      setData(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeframe])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchData, 60_000)
    return () => clearInterval(id)
  }, [autoRefresh, timeframe])

  const getOverallColor = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return 'text-green-600 bg-green-50 border-green-200'
      case 'BEARISH': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getOverallIcon = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return <TrendingUp className="h-8 w-8" />
      case 'BEARISH': return <TrendingDown className="h-8 w-8" />
      default: return <Minus className="h-8 w-8" />
    }
  }

  const getSignalBadge = (signal: string, isFresh: boolean) => {
    if (!isFresh) {
      return <Badge variant="outline" className="opacity-50">Old {signal}</Badge>
    }

    switch (signal) {
      case 'BUY':
        return <Badge className="bg-green-600">🟢 BUY</Badge>
      case 'SELL':
        return <Badge className="bg-red-600">🔴 SELL</Badge>
      default:
        return <Badge variant="secondary">⚪ NONE</Badge>
    }
  }

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome || outcome === 'NONE') return null

    if (outcome.startsWith('TP')) {
      return <Badge className="bg-green-500 ml-2">✅ {outcome}</Badge>
    }
    if (outcome === 'SL') {
      return <Badge className="bg-red-500 ml-2">❌ SL</Badge>
    }
    return null
  }

  return (
    <AuthWrapper>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">📊 BTC Trend Analysis</CardTitle>
                <CardDescription>
                  Phân tích xu hướng Bitcoin qua tất cả các chỉ báo
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m">15m</SelectItem>
                    <SelectItem value="1h">1h</SelectItem>
                    <SelectItem value="4h">4h</SelectItem>
                    <SelectItem value="1d">1d</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                  {autoRefresh ? 'Auto' : 'Manual'}
                </Button>
                <Button size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        )}

        {/* Main Content */}
        {data && (
          <>
            {/* Overall Consensus */}
            <Card className={`border-2 ${getOverallColor(data.consensus.overall)}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {getOverallIcon(data.consensus.overall)}
                  <div>
                    <div className="text-3xl font-bold">{data.consensus.overall}</div>
                    <div className="text-sm font-normal opacity-75">
                      Strength: {data.consensus.strength}% | Avg Win Rate: {data.consensus.avgWinRate}%
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">${data.currentPrice.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Current Price</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{data.consensus.freshBuyCount}</div>
                    <div className="text-sm text-gray-600">Fresh BUY</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{data.consensus.freshSellCount}</div>
                    <div className="text-sm text-gray-600">Fresh SELL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{data.consensus.noneCount}</div>
                    <div className="text-sm text-gray-600">No Signal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{data.indicators.length}</div>
                    <div className="text-sm text-gray-600">Total Indicators</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Indicators */}
            <div className="grid gap-4">
              {data.indicators
                .sort((a, b) => {
                  // Sort by: fresh signals first, then by win rate
                  if (a.isSignalFresh && !b.isSignalFresh) return -1
                  if (!a.isSignalFresh && b.isSignalFresh) return 1
                  return b.winRate - a.winRate
                })
                .map((ind) => (
                  <Card key={ind.type} className={ind.isSignalFresh ? 'border-2 border-blue-300' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{ind.name}</CardTitle>
                            <Badge variant="outline">{ind.winRate}% WR</Badge>
                            {ind.isSignalFresh && (
                              <Badge className="bg-blue-500">✨ Fresh</Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {ind.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSignalBadge(ind.lastSignal, ind.isSignalFresh)}
                          {getOutcomeBadge(ind.lastSignalOutcome)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        {/* Signal Info */}
                        <div>
                          <div className="font-semibold mb-1">Last Signal</div>
                          <div className="text-gray-600">
                            {ind.lastSignalTime ? new Date(ind.lastSignalTime).toLocaleString('vi-VN') : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ind.barsSinceSignal} bars ago
                          </div>
                        </div>

                        {/* Entry Price */}
                        <div>
                          <div className="font-semibold mb-1">Entry Price</div>
                          <div className="text-gray-600">
                            ${ind.lastSignalPrice?.toLocaleString() || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ind.entryLevels.pos === 1 ? 'LONG' : ind.entryLevels.pos === -1 ? 'SHORT' : 'NONE'}
                          </div>
                        </div>

                        {/* Targets */}
                        <div>
                          <div className="font-semibold mb-1">Targets</div>
                          <div className="text-xs space-y-0.5">
                            <div>TP1: ${ind.entryLevels.tp1?.toLocaleString()}</div>
                            <div>TP2: ${ind.entryLevels.tp2?.toLocaleString()}</div>
                            <div>TP3: ${ind.entryLevels.tp3?.toLocaleString()}</div>
                          </div>
                        </div>

                        {/* Stop Loss */}
                        <div>
                          <div className="font-semibold mb-1">Stop Loss</div>
                          <div className="text-red-600">
                            ${ind.entryLevels.sl?.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Confidence: {ind.confidence}%
                          </div>
                        </div>
                      </div>

                      {/* Reasons */}
                      {ind.reasons && ind.reasons.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="font-semibold text-sm mb-2">Reasons:</div>
                          <div className="flex flex-wrap gap-2">
                            {ind.reasons.map((reason, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </>
        )}
      </div>
    </AuthWrapper>
  )
}

export default BTCTrendPage
