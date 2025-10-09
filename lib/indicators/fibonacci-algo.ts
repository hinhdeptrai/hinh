import type { BaseIndicator, FibonacciAlgoSettings, Klines, IndicatorResult } from './types'
import { getIndicator } from '@/lib/indicator'

/**
 * Fibonacci Algo Indicator (Wrapper for existing implementation)
 *
 * This wraps the existing indicator.ts logic to integrate with the new multi-indicator system.
 * Uses pivot points, MA filter, and cup patterns.
 */
export class FibonacciAlgoIndicator implements BaseIndicator {
  getName(): string {
    return 'Fibonacci Algo'
  }

  getDescription(): string {
    return 'Infinity Algo với Pivot Points breakout + MA filter + Cup patterns (current implementation)'
  }

  getWinRate(): number {
    return 65 // Estimated based on current usage
  }

  getDefaultSettings(): FibonacciAlgoSettings {
    return {
      PIVOT_PERIOD: 5,        // Spec default: 5 (2-20 range)
      THRESHOLD_RATE_PCT: 5,  // Spec default: 5.0%
      MIN_TESTS: 2,           // Spec default: 2
      MAX_LEVELS: 100,        // Spec default: 100 (cap for performance)
      MA_TYPE: 'EMA',         // Spec default: EMA
      MA_LENGTH: 21,          // Spec default: 21
      MA_FILTER: true,        // Spec default: true
      USE_HEIKEN_ASHI: false, // Spec default: false
      ENABLE_CUP_PATTERN: true, // Spec default: true
      TP1_LONG_PCT: 0.3,      // Spec default: 0.3%
      TP2_LONG_PCT: 1.0,      // Spec default: 1.0%
      TP3_LONG_PCT: 2.0,      // Spec default: 2.0%
      TP4_LONG_PCT: 3.0,      // Spec default: 3.0%
      TP5_LONG_PCT: 7.5,      // Spec default: 7.5%
      TP6_LONG_PCT: 16.5,     // Spec default: 16.5%
      TP1_SHORT_PCT: 0.3,     // Spec default: 0.3%
      TP2_SHORT_PCT: 1.0,     // Spec default: 1.0%
      TP3_SHORT_PCT: 2.0,     // Spec default: 2.0%
      TP4_SHORT_PCT: 3.0,     // Spec default: 3.0%
      TP5_SHORT_PCT: 7.5,     // Spec default: 7.5%
      TP6_SHORT_PCT: 16.5,    // Spec default: 16.5%
      SL_LONG_PCT: 4.5,       // Spec default: 4.5%
      SL_SHORT_PCT: 4.5,      // Spec default: 4.5%
      MAX_SIGNAL_AGE_BARS: 3,
    }
  }

  async analyze(data: Klines, customSettings?: Partial<FibonacciAlgoSettings>): Promise<IndicatorResult> {
    // Note: getIndicator expects to fetch its own klines, but we already have them
    // For now, we'll just pass dummy symbol/interval and it will refetch
    // TODO: Refactor getIndicator to accept pre-fetched klines

    // This is a temporary hack - getIndicator will re-fetch from Binance
    // We need symbol and timeframe from somewhere
    // These will be passed by IndicatorFactory.analyzeWithIndicator
    throw new Error('FibonacciAlgoIndicator.analyze() requires symbol and timeframe. Use IndicatorFactory.analyzeWithIndicator() instead.')
  }

  // Special method for Fibonacci that needs to call old API
  async analyzeWithSymbol(symbol: string, timeframe: string, customSettings?: Partial<FibonacciAlgoSettings>): Promise<IndicatorResult> {
    // Call existing indicator logic
    const result = await getIndicator({
      symbol,
      intervals: [timeframe],
      limit: 500,
      settings: customSettings as any,
    })

    // Convert result to IndicatorResult format (should already match)
    return {
      ...result,
      settings: customSettings || this.getDefaultSettings(),
      confidence: 65,
      reasons: ['Pivot breakout + MA filter'],
      indicatorType: 'FIBONACCI_ALGO',
    } as IndicatorResult
  }
}
