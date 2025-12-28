// Strat Pattern Types
export type StratPatternType = "1" | "2U" | "2D" | "3";

// Timeframe options (1w removed - API has incomplete weekly data)
export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "12h", "1d"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

// Market definition
export interface Market {
    symbol: string;
    marketIndex: number;
    marketId: number;
}

// Default markets to track - market_id values from Lighter.xyz API
export const DEFAULT_MARKETS: Market[] = [
    { symbol: "BTC", marketIndex: 0, marketId: 1 },
    { symbol: "ETH", marketIndex: 1, marketId: 0 },
    { symbol: "SOL", marketIndex: 2, marketId: 2 },
    { symbol: "DOGE", marketIndex: 3, marketId: 3 },
    { symbol: "1000PEPE", marketIndex: 4, marketId: 4 },
    { symbol: "WIF", marketIndex: 5, marketId: 5 },
    { symbol: "WLD", marketIndex: 6, marketId: 6 },
    { symbol: "XRP", marketIndex: 7, marketId: 7 },
    { symbol: "LINK", marketIndex: 8, marketId: 8 },
    { symbol: "AVAX", marketIndex: 9, marketId: 9 },
    { symbol: "FARTCOIN", marketIndex: 10, marketId: 21 },
    { symbol: "HYPE", marketIndex: 11, marketId: 24 },
];

// Candle with Strat classification
export interface StratCandle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    patternType?: StratPatternType;
}

// Actionable trading setup prediction
export interface ActionableSetup {
    pattern: string;           // e.g., "2-2 Reversal", "3-1-2U Continuation"
    direction: "bullish" | "bearish";
    description: string;
    confidence: "high" | "medium" | "low";
}

// Market analysis result
export interface MarketAnalysis {
    market: Market;
    candles: StratCandle[];
    currentCandle: StratCandle | null;
    patternSequence: string;   // e.g., "2U-1-2U-3-2D"
    actionableSetup: ActionableSetup | null;
}

// Resolution mapping for API calls
export const RESOLUTION_MAP: Record<Timeframe, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "12h": "12h",
    "1d": "1d",
};
