import { NextRequest, NextResponse } from "next/server"
import { IndicatorFactory, fetchKlines } from "@/lib/indicators/factory"
import type { IndicatorType } from "@/lib/indicators/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/symbol-trend?symbol=BTCUSDT&timeframe=4h&altTimeframe=1h
 *
 * Analyzes any symbol across ALL indicators to show consensus/divergence
 * Supports dual timeframe analysis (main + alt)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || 'BTCUSDT'
    const timeframe = searchParams.get('timeframe') || '4h'
    const altTimeframe = searchParams.get('altTimeframe') || '1h'
    const limit = 500

    // Get all available indicators
    const availableIndicators = IndicatorFactory.getAvailableIndicators()

    // Fetch klines for both timeframes in parallel
    const [klineData, altKlineData] = await Promise.all([
      fetchKlines(symbol, timeframe, limit),
      fetchKlines(symbol, altTimeframe, limit)
    ])

    // Analyze MAIN timeframe with each indicator in parallel
    const mainResults = await Promise.allSettled(
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
          timeframe,
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

    // Analyze ALT timeframe with each indicator in parallel
    const altResults = await Promise.allSettled(
      availableIndicators.map(async (ind) => {
        const result = await IndicatorFactory.analyzeWithIndicator(
          ind.type,
          altKlineData,
          symbol,
          altTimeframe
        )

        return {
          type: ind.type,
          name: ind.name,
          description: ind.description,
          winRate: ind.winRate,
          timeframe: altTimeframe,
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
    const indicators = mainResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)

    const altIndicators = altResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)

    // Calculate consensus for MAIN timeframe
    const buyCount = indicators.filter(i => i.lastSignal === 'BUY').length
    const sellCount = indicators.filter(i => i.lastSignal === 'SELL').length
    const noneCount = indicators.filter(i => i.lastSignal === 'NONE').length

    const freshBuyCount = indicators.filter(
      i => i.lastSignal === 'BUY' && i.isSignalFresh
    ).length
    const freshSellCount = indicators.filter(
      i => i.lastSignal === 'SELL' && i.isSignalFresh
    ).length

    // Determine overall trend for MAIN
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

    // Calculate consensus for ALT timeframe
    const altBuyCount = altIndicators.filter(i => i.lastSignal === 'BUY').length
    const altSellCount = altIndicators.filter(i => i.lastSignal === 'SELL').length
    const altNoneCount = altIndicators.filter(i => i.lastSignal === 'NONE').length

    const altFreshBuyCount = altIndicators.filter(
      i => i.lastSignal === 'BUY' && i.isSignalFresh
    ).length
    const altFreshSellCount = altIndicators.filter(
      i => i.lastSignal === 'SELL' && i.isSignalFresh
    ).length

    // Determine overall trend for ALT
    let altOverallTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
    let altTrendStrength = 0

    if (altFreshBuyCount >= 2) {
      altOverallTrend = 'BULLISH'
      altTrendStrength = (altFreshBuyCount / altIndicators.length) * 100
    } else if (altFreshSellCount >= 2) {
      altOverallTrend = 'BEARISH'
      altTrendStrength = (altFreshSellCount / altIndicators.length) * 100
    }

    const altFreshIndicators = altIndicators.filter(i => i.isSignalFresh)
    const altAvgWinRate = altFreshIndicators.length > 0
      ? altFreshIndicators.reduce((sum, i) => sum + i.winRate, 0) / altFreshIndicators.length
      : 0

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      altTimeframe,
      currentPrice: klineData.c[klineData.c.length - 1],
      timestamp: new Date(klineData.t[klineData.t.length - 1]).toISOString(),

      // Main timeframe consensus
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

      // Alt timeframe consensus
      altConsensus: {
        overall: altOverallTrend,
        strength: Math.round(altTrendStrength),
        avgWinRate: Math.round(altAvgWinRate),
        buyCount: altBuyCount,
        sellCount: altSellCount,
        noneCount: altNoneCount,
        freshBuyCount: altFreshBuyCount,
        freshSellCount: altFreshSellCount,
      },

      indicators,
      altIndicators,
    })
  } catch (e: any) {
    console.error('Symbol trend error:', e)
    return NextResponse.json(
      { error: e.message || 'Internal server error', stack: e.stack },
      { status: 500 }
    )
  }
}
