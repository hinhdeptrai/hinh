import { NextRequest, NextResponse } from "next/server"
import { IndicatorFactory, fetchKlines } from "@/lib/indicators/factory"
import type { IndicatorType } from "@/lib/indicators/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/btc-trend?timeframe=4h&altTimeframe=1h
 *
 * Analyzes BTC across ALL indicators to show consensus/divergence
 * Supports dual timeframe analysis (main + alt)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') || '4h'
    const altTimeframe = searchParams.get('altTimeframe') || '1h'
    const symbol = 'BTCUSDT'
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

    // Calculate volume trend (compare last 10 bars vs previous 50 bars average)
    const recentVolumes = klineData.v.slice(-10)
    const historicalVolumes = klineData.v.slice(-60, -10)
    const recentAvgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length
    const historicalAvgVolume = historicalVolumes.reduce((a, b) => a + b, 0) / historicalVolumes.length
    const volumeChange = ((recentAvgVolume - historicalAvgVolume) / historicalAvgVolume) * 100
    const volumeTrend = volumeChange > 10 ? 'UP' : volumeChange < -10 ? 'DOWN' : 'NEUTRAL'

    // Calculate price change (24h and current session)
    const price24hAgo = klineData.c[Math.max(0, klineData.c.length - 24)]
    const currentPrice = klineData.c[klineData.c.length - 1]
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100
    
    // Get high/low of current period
    const periodHigh = Math.max(...klineData.h.slice(-24))
    const periodLow = Math.min(...klineData.l.slice(-24))

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      altTimeframe,
      currentPrice,
      timestamp: new Date(klineData.t[klineData.t.length - 1]).toISOString(),
      
      // Price analysis
      priceAnalysis: {
        current: currentPrice,
        change24h: priceChange24h,
        trend: priceChange24h > 1 ? 'UP' : priceChange24h < -1 ? 'DOWN' : 'NEUTRAL',
        high24h: periodHigh,
        low24h: periodLow,
        fromHigh: ((currentPrice - periodHigh) / periodHigh) * 100,
        fromLow: ((currentPrice - periodLow) / periodLow) * 100,
      },
      
      // Volume analysis
      volumeAnalysis: {
        current: recentAvgVolume,
        average: historicalAvgVolume,
        change: volumeChange,
        trend: volumeTrend,
      },

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
    console.error('BTC trend error:', e)
    return NextResponse.json(
      { error: e.message || 'Internal server error', stack: e.stack },
      { status: 500 }
    )
  }
}
