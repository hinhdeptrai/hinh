import { NextRequest, NextResponse } from "next/server"
import { IndicatorFactory, fetchKlines } from "@/lib/indicators/factory"
import type { IndicatorType } from "@/lib/indicators/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/btc-trend?timeframe=4h
 *
 * Analyzes BTC across ALL indicators to show consensus/divergence
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') || '4h'
    const symbol = 'BTCUSDT'
    const limit = 500

    // Get all available indicators
    const availableIndicators = IndicatorFactory.getAvailableIndicators()

    // Fetch klines once (reuse for all indicators)
    const klineData = await fetchKlines(symbol, timeframe, limit)

    // Analyze with each indicator in parallel
    const results = await Promise.allSettled(
      availableIndicators.map(async (ind) => {
        const result = await IndicatorFactory.analyzeWithIndicator(
          ind.type,
          klineData,
          symbol,
          timeframe
        )

        return {
          type: ind.type,
          name: ind.name,
          description: ind.description,
          winRate: ind.winRate,
          signal: result.signal,
          lastSignal: result.lastSignal,
          lastSignalTime: result.lastSignalTime,
          lastSignalPrice: result.lastSignalPrice,
          barsSinceSignal: result.barsSinceSignal,
          isSignalFresh: result.isSignalFresh,
          confidence: result.confidence,
          reasons: result.reasons,
          entryLevels: result.entryLevels,
          lastSignalOutcome: result.lastSignalOutcome,
        }
      })
    )

    // Extract successful results
    const indicators = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)

    // Calculate consensus
    const buyCount = indicators.filter(i => i.lastSignal === 'BUY').length
    const sellCount = indicators.filter(i => i.lastSignal === 'SELL').length
    const noneCount = indicators.filter(i => i.lastSignal === 'NONE').length

    const freshBuyCount = indicators.filter(
      i => i.lastSignal === 'BUY' && i.isSignalFresh
    ).length
    const freshSellCount = indicators.filter(
      i => i.lastSignal === 'SELL' && i.isSignalFresh
    ).length

    // Determine overall trend
    let overallTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
    let trendStrength = 0

    if (freshBuyCount >= 2) {
      overallTrend = 'BULLISH'
      trendStrength = (freshBuyCount / indicators.length) * 100
    } else if (freshSellCount >= 2) {
      overallTrend = 'BEARISH'
      trendStrength = (freshSellCount / indicators.length) * 100
    }

    // Calculate average win rate of indicators with fresh signals
    const freshIndicators = indicators.filter(i => i.isSignalFresh)
    const avgWinRate = freshIndicators.length > 0
      ? freshIndicators.reduce((sum, i) => sum + i.winRate, 0) / freshIndicators.length
      : 0

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      currentPrice: klineData.c[klineData.c.length - 1],
      timestamp: new Date(klineData.t[klineData.t.length - 1]).toISOString(),

      consensus: {
        overall: overallTrend,
        strength: Math.round(trendStrength),
        avgWinRate: Math.round(avgWinRate),
        buyCount,
        sellCount,
        noneCount,
        freshBuyCount,
        freshSellCount,
      },

      indicators,
    })
  } catch (e: any) {
    console.error('BTC trend error:', e)
    return NextResponse.json(
      { error: e.message || 'Internal server error', stack: e.stack },
      { status: 500 }
    )
  }
}
