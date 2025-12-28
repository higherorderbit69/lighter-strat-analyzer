import type { Candle, StratCandle, StratPatternType, ActionableSetup, MarketAnalysis, Market, Timeframe } from '@shared/types';
import { fetchCandles } from './lighterApi';

/**
 * Classify a candle's Strat pattern type by comparing with the previous candle.
 * 
 * Type 1 (Inside Bar): Current high < previous high AND current low > previous low
 * Type 2-Up: Current high > previous high AND current low >= previous low
 * Type 2-Down: Current high <= previous high AND current low < previous low
 * Type 3 (Outside Bar): Current high > previous high AND current low < previous low
 */
export function classifyStratPattern(current: Candle, previous: Candle): StratPatternType {
  const breaksHigh = current.high > previous.high;
  const breaksLow = current.low < previous.low;
  const holdsHigh = current.high <= previous.high;
  const holdsLow = current.low >= previous.low;

  if (breaksHigh && breaksLow) {
    return '3'; // Outside Bar
  }
  if (breaksHigh && holdsLow) {
    return '2U'; // Directional Up
  }
  if (holdsHigh && breaksLow) {
    return '2D'; // Directional Down
  }
  // Inside Bar (holdsHigh && holdsLow, but strictly inside)
  if (current.high < previous.high && current.low > previous.low) {
    return '1';
  }
  // Edge case: touches but doesn't break - treat as inside
  return '1';
}

/**
 * Analyze candles and add Strat pattern classifications.
 */
export function analyzeCandles(candles: Candle[]): StratCandle[] {
  if (candles.length < 2) {
    return candles.map((c) => ({ ...c, patternType: null }));
  }

  const result: StratCandle[] = [{ ...candles[0], patternType: null }];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    const patternType = classifyStratPattern(current, previous);
    result.push({ ...current, patternType });
  }

  return result;
}

/**
 * Get pattern sequence string from recent candles (e.g., "2U-1-2U", "3-1-2D").
 */
export function getPatternSequence(stratCandles: StratCandle[], length: number = 3): string {
  const recent = stratCandles.slice(-length);
  return recent
    .map((c) => c.patternType || '?')
    .join('-');
}

/**
 * Identify actionable trading setups based on pattern sequences.
 */
export function identifyActionableSetup(stratCandles: StratCandle[]): ActionableSetup | null {
  if (stratCandles.length < 3) return null;

  const last3 = stratCandles.slice(-3);
  const [first, second, third] = last3;
  
  if (!first.patternType || !second.patternType || !third.patternType) return null;

  const sequence = `${first.patternType}-${second.patternType}-${third.patternType}`;

  // 2-1-2 Continuation Patterns
  if (sequence === '2U-1-2U') {
    return {
      type: 'continuation',
      pattern: '2-1-2U',
      direction: 'bullish',
      description: 'Bullish continuation: Upward move, consolidation, another upward break',
      triggerPrice: third.high,
    };
  }
  if (sequence === '2D-1-2D') {
    return {
      type: 'continuation',
      pattern: '2-1-2D',
      direction: 'bearish',
      description: 'Bearish continuation: Downward move, consolidation, another downward break',
      triggerPrice: third.low,
    };
  }

  // 2-1-2 Reversal Patterns
  if (sequence === '2D-1-2U') {
    return {
      type: 'reversal',
      pattern: '2-1-2U Rev',
      direction: 'bullish',
      description: 'Bullish reversal: Downward move, consolidation, upward break',
      triggerPrice: third.high,
    };
  }
  if (sequence === '2U-1-2D') {
    return {
      type: 'reversal',
      pattern: '2-1-2D Rev',
      direction: 'bearish',
      description: 'Bearish reversal: Upward move, consolidation, downward break',
      triggerPrice: third.low,
    };
  }

  // 3-1-2 Patterns (Outside bar followed by inside, then directional)
  if (sequence === '3-1-2U') {
    return {
      type: 'breakout',
      pattern: '3-1-2U',
      direction: 'bullish',
      description: 'Bullish breakout: Volatility expansion, consolidation, upward resolution',
      triggerPrice: third.high,
    };
  }
  if (sequence === '3-1-2D') {
    return {
      type: 'breakout',
      pattern: '3-1-2D',
      direction: 'bearish',
      description: 'Bearish breakout: Volatility expansion, consolidation, downward resolution',
      triggerPrice: third.low,
    };
  }

  // 1-2-2 Patterns (Consolidation followed by two directional bars)
  if (sequence === '1-2U-2U') {
    return {
      type: 'continuation',
      pattern: '1-2-2U',
      direction: 'bullish',
      description: 'Strong bullish momentum: Consolidation breakout with follow-through',
      triggerPrice: third.high,
    };
  }
  if (sequence === '1-2D-2D') {
    return {
      type: 'continuation',
      pattern: '1-2-2D',
      direction: 'bearish',
      description: 'Strong bearish momentum: Consolidation breakdown with follow-through',
      triggerPrice: third.low,
    };
  }

  return null;
}

/**
 * Perform full market analysis for a single market.
 */
export async function analyzeMarket(
  market: Market,
  timeframe: Timeframe,
  candleCount: number = 20
): Promise<MarketAnalysis> {
  try {
    const candles = await fetchCandles(market.marketIndex, timeframe, candleCount);
    const stratCandles = analyzeCandles(candles);
    const patternSequence = getPatternSequence(stratCandles, 5);
    const actionableSetup = identifyActionableSetup(stratCandles);

    return {
      market,
      timeframe,
      currentCandle: stratCandles[stratCandles.length - 1] || null,
      previousCandles: stratCandles.slice(-10),
      patternSequence,
      actionableSetup,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(`Error analyzing market ${market.symbol}:`, error);
    return {
      market,
      timeframe,
      currentCandle: null,
      previousCandles: [],
      patternSequence: '',
      actionableSetup: null,
      lastUpdated: Date.now(),
    };
  }
}

/**
 * Analyze multiple markets in parallel.
 */
export async function analyzeMultipleMarkets(
  markets: Market[],
  timeframe: Timeframe,
  candleCount: number = 20
): Promise<MarketAnalysis[]> {
  const promises = markets.map((market) => analyzeMarket(market, timeframe, candleCount));
  return Promise.all(promises);
}
