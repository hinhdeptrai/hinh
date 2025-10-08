"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Settings2, RotateCcw } from "lucide-react"

type IndicatorType =
  | 'FIBONACCI_ALGO'
  | 'RSI_MACD_EMA'
  | 'MACD_BB'
  | 'RSI_VOLUME_BB'
  | 'SUPERTREND_EMA'
  | 'EMA_CROSS_RSI'

type AvailableIndicator = {
  type: IndicatorType
  name: string
  description: string
  winRate: number
}

export function IndicatorSelector({
  symbol,
  timeframe,
  currentIndicator,
  onSelect,
}: {
  symbol: string
  timeframe: string
  currentIndicator?: IndicatorType
  onSelect?: (indicator: IndicatorType) => void
}) {
  const [selected, setSelected] = useState<IndicatorType>(currentIndicator || 'FIBONACCI_ALGO')
  const [available, setAvailable] = useState<AvailableIndicator[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch available indicators
  useEffect(() => {
    async function loadAvailable() {
      try {
        const res = await fetch('/api/indicator-settings')
        if (res.ok) {
          const data = await res.json()
          setAvailable(data.available || [])
        }
      } catch (e) {
        console.error('Failed to load available indicators:', e)
      }
    }
    loadAvailable()
  }, [])

  // Load current setting from DB
  useEffect(() => {
    async function loadSetting() {
      setLoading(true)
      try {
        const res = await fetch(`/api/indicator-settings?symbol=${symbol}&timeframe=${timeframe}`)
        if (res.ok) {
          const data = await res.json()
          setSelected(data.indicator_type || 'FIBONACCI_ALGO')
        }
      } catch (e) {
        console.error('Failed to load indicator setting:', e)
      } finally {
        setLoading(false)
      }
    }
    if (symbol && timeframe) {
      loadSetting()
    }
  }, [symbol, timeframe])

  const handleSelect = async (value: IndicatorType) => {
    setSelected(value)
    setSaving(true)

    try {
      const res = await fetch('/api/indicator-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          indicator_type: value,
          settings: null, // Use default settings
        }),
      })

      if (res.ok) {
        onSelect?.(value)
      } else {
        const error = await res.json()
        alert(`Lỗi: ${error.error || 'Không lưu được'}`)
      }
    } catch (e: any) {
      console.error('Failed to save indicator setting:', e)
      alert(`Lỗi: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/indicator-settings?symbol=${symbol}&timeframe=${timeframe}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setSelected('FIBONACCI_ALGO')
        onSelect?.('FIBONACCI_ALGO')
      }
    } catch (e) {
      console.error('Failed to reset indicator setting:', e)
    } finally {
      setSaving(false)
    }
  }

  const getWinRateBadge = (winRate: number) => {
    if (winRate >= 75) return <Badge variant="success" className="ml-2 text-xs">🏆 {winRate}%</Badge>
    if (winRate >= 70) return <Badge variant="info" className="ml-2 text-xs">⭐ {winRate}%</Badge>
    if (winRate >= 65) return <Badge variant="secondary" className="ml-2 text-xs">📈 {winRate}%</Badge>
    return <Badge variant="secondary" className="ml-2 text-xs">{winRate}%</Badge>
  }

  const getIndicatorLabel = (type: IndicatorType) => {
    const ind = available.find(a => a.type === type)
    if (!ind) {
      // Fallback names
      const fallbackNames: Record<IndicatorType, string> = {
        'FIBONACCI_ALGO': 'Fibonacci Algo',
        'RSI_MACD_EMA': 'RSI + MACD + EMA',
        'MACD_BB': 'MACD + BB',
        'RSI_VOLUME_BB': 'RSI + Volume + BB',
        'SUPERTREND_EMA': 'Supertrend + EMA',
        'EMA_CROSS_RSI': 'EMA Cross + RSI',
      }
      return fallbackNames[type] || type
    }
    return ind.name
  }

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground animate-pulse">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Select
        value={selected}
        onValueChange={handleSelect}
        disabled={saving}
      >
        <SelectTrigger className="h-7 text-xs min-w-[140px]">
          <SelectValue placeholder="Chọn indicator" />
        </SelectTrigger>
        <SelectContent>
          {available.length > 0 ? (
            available
              .sort((a, b) => b.winRate - a.winRate)
              .map((ind) => (
                <SelectItem key={ind.type} value={ind.type} className="text-xs">
                  <div className="flex items-center">
                    {ind.name}
                    {getWinRateBadge(ind.winRate)}
                  </div>
                </SelectItem>
              ))
          ) : (
            <>
              <SelectItem value="FIBONACCI_ALGO" className="text-xs">
                🎯 Fibonacci Algo
              </SelectItem>
              <SelectItem value="MACD_BB" className="text-xs">
                🏆 MACD + BB (78%)
              </SelectItem>
              <SelectItem value="RSI_MACD_EMA" className="text-xs">
                ⭐ RSI + MACD + EMA (73%)
              </SelectItem>
              <SelectItem value="RSI_VOLUME_BB" className="text-xs">
                📊 RSI + Volume + BB (70%)
              </SelectItem>
              <SelectItem value="SUPERTREND_EMA" className="text-xs">
                📈 Supertrend + EMA (65%)
              </SelectItem>
              <SelectItem value="EMA_CROSS_RSI" className="text-xs">
                EMA Cross + RSI (60%)
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleReset}
            disabled={saving || selected === 'FIBONACCI_ALGO'}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Reset về Fibonacci Algo</p>
        </TooltipContent>
      </Tooltip>

      {saving && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Đang lưu...
        </span>
      )}
    </div>
  )
}
