import { NextRequest, NextResponse } from 'next/server'
import { getIndicatorSettings, saveIndicatorSettings, deleteIndicatorSettings } from '@/lib/db'
import { IndicatorFactory } from '@/lib/indicators/factory'

// GET /api/indicator-settings?symbol=BTCUSDT&timeframe=4h
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    const timeframe = searchParams.get('timeframe')

    // If no params, return list of available indicators
    if (!symbol && !timeframe) {
      const available = IndicatorFactory.getAvailableIndicators()
      return NextResponse.json({ available })
    }

    if (!symbol || !timeframe) {
      return NextResponse.json(
        { error: 'Missing symbol or timeframe parameter' },
        { status: 400 }
      )
    }

    const settings = await getIndicatorSettings(symbol.toUpperCase(), timeframe)

    if (!settings) {
      // Return default
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        timeframe,
        indicator_type: 'FIBONACCI_ALGO',
        settings: null,
      })
    }

    // Parse JSON settings
    if (settings.settings && typeof settings.settings === 'string') {
      try {
        settings.settings = JSON.parse(settings.settings)
      } catch (e) {
        // Already parsed or invalid
      }
    }

    return NextResponse.json(settings)
  } catch (e: any) {
    console.error('GET /api/indicator-settings error:', e)
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/indicator-settings
// Body: { symbol, timeframe, indicator_type, settings? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { symbol, timeframe, indicator_type, settings } = body

    if (!symbol || !timeframe || !indicator_type) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, timeframe, indicator_type' },
        { status: 400 }
      )
    }

    // Validate indicator type
    try {
      IndicatorFactory.create(indicator_type)
    } catch (e: any) {
      return NextResponse.json(
        { error: `Invalid indicator type: ${e.message}` },
        { status: 400 }
      )
    }

    await saveIndicatorSettings({
      symbol: symbol.toUpperCase(),
      timeframe,
      indicator_type,
      settings,
    })

    return NextResponse.json({
      success: true,
      message: 'Indicator settings saved successfully',
    })
  } catch (e: any) {
    console.error('POST /api/indicator-settings error:', e)
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/indicator-settings?symbol=BTCUSDT&timeframe=4h
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    const timeframe = searchParams.get('timeframe')

    if (!symbol || !timeframe) {
      return NextResponse.json(
        { error: 'Missing symbol or timeframe parameter' },
        { status: 400 }
      )
    }

    await deleteIndicatorSettings(symbol.toUpperCase(), timeframe)

    return NextResponse.json({
      success: true,
      message: 'Indicator settings deleted successfully (reset to default)',
    })
  } catch (e: any) {
    console.error('DELETE /api/indicator-settings error:', e)
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
