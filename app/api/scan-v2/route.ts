import { NextRequest, NextResponse } from "next/server"
import { IndicatorFactory, fetchKlines } from "@/lib/indicators/factory"

export const dynamic = "force-dynamic"

/**
 * POST /api/scan-v2
 *
 * Multi-indicator scanner endpoint
 *
 * Body: {
 *   symbol: string,
 *   timeframe: string,
 *   indicator_type?: string,  // Default: FIBONACCI_ALGO
 *   limit?: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      symbol,
      timeframe,
      indicator_type = 'FIBONACCI_ALGO',
      limit = 500
    } = body

    if (!symbol || !timeframe) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, timeframe' },
        { status: 400 }
      )
    }

    // Validate indicator type
    let indicator
    try {
      indicator = IndicatorFactory.create(indicator_type)
    } catch (e: any) {
      return NextResponse.json(
        { error: `Invalid indicator type: ${e.message}` },
        { status: 400 }
      )
    }

    // Fetch kline data from Binance
    const klineData = await fetchKlines(symbol.toUpperCase(), timeframe, limit)

    // Analyze with selected indicator
    const result = await IndicatorFactory.analyzeWithIndicator(
      indicator_type,
      klineData,
      symbol.toUpperCase(),
      timeframe
    )

    return NextResponse.json({
      success: true,
      indicator_type,
      indicator_name: indicator.getName(),
      data: result,
    })
  } catch (e: any) {
    console.error('Scan v2 error:', e)
    return NextResponse.json(
      { error: e.message || 'Internal server error', stack: e.stack },
      { status: 500 }
    )
  }
}

/**
 * GET /api/scan-v2?symbol=BTCUSDT&timeframe=4h&indicator_type=MACD_BB
 *
 * Alternative GET endpoint for single symbol scan
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    const timeframe = searchParams.get('timeframe')
    const indicator_type = searchParams.get('indicator_type') || 'FIBONACCI_ALGO'
    const limit = Number(searchParams.get('limit') || 500)

    if (!symbol || !timeframe) {
      return NextResponse.json(
        { error: 'Missing required params: symbol, timeframe' },
        { status: 400 }
      )
    }

    // Validate indicator type
    let indicator
    try {
      indicator = IndicatorFactory.create(indicator_type)
    } catch (e: any) {
      return NextResponse.json(
        { error: `Invalid indicator type: ${e.message}` },
        { status: 400 }
      )
    }

    // Fetch kline data
    const klineData = await fetchKlines(symbol.toUpperCase(), timeframe, limit)

    // Analyze
    const result = await IndicatorFactory.analyzeWithIndicator(
      indicator_type,
      klineData,
      symbol.toUpperCase(),
      timeframe
    )

    return NextResponse.json({
      success: true,
      indicator_type,
      indicator_name: indicator.getName(),
      data: result,
    })
  } catch (e: any) {
    console.error('Scan v2 GET error:', e)
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
