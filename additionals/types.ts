/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// Strat Pattern Types
export type StratPatternType = '1' | '2U' | '2D' | '3';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StratCandle extends Candle {
  patternType: StratPatternType | null;
  patternSequence?: string;
}

export interface Market {
  symbol: string;
  marketIndex: number;
}

export interface MarketAnalysis {
  market: Market;
  timeframe: string;
  currentCandle: StratCandle | null;
  previousCandles: StratCandle[];
  patternSequence: string;
  actionableSetup: ActionableSetup | null;
  lastUpdated: number;
}

export interface ActionableSetup {
  type: 'continuation' | 'reversal' | 'breakout';
  pattern: string;
  direction: 'bullish' | 'bearish';
  description: string;
  triggerPrice?: number;
}

export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '12h', '1d', '1w'] as const;
export type Timeframe = typeof TIMEFRAMES[number];

export const DEFAULT_MARKETS: Market[] = [
  { symbol: 'BTC', marketIndex: 1 },
  { symbol: 'ETH', marketIndex: 0 },
  { symbol: 'SOL', marketIndex: 2 },
  { symbol: 'DOGE', marketIndex: 3 },
  { symbol: '1000PEPE', marketIndex: 4 },
  { symbol: 'WIF', marketIndex: 5 },
  { symbol: 'WLD', marketIndex: 6 },
  { symbol: 'XRP', marketIndex: 7 },
  { symbol: 'LINK', marketIndex: 8 },
  { symbol: 'AVAX', marketIndex: 9 },
];

export const PATTERN_DESCRIPTIONS: Record<StratPatternType, { name: string; description: string; color: string }> = {
  '1': {
    name: 'Inside Bar',
    description: 'Consolidation - High lower than previous, Low higher than previous',
    color: 'cyan',
  },
  '2U': {
    name: 'Directional Up',
    description: 'Bullish - Breaks previous high, holds previous low',
    color: 'green',
  },
  '2D': {
    name: 'Directional Down',
    description: 'Bearish - Breaks previous low, holds previous high',
    color: 'red',
  },
  '3': {
    name: 'Outside Bar',
    description: 'Volatility - Breaks both previous high and low',
    color: 'pink',
  },
};
