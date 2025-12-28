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
    { symbol: "HYPE", marketIndex: 3, marketId: 24 },
    { symbol: "FARTCOIN", marketIndex: 4, marketId: 21 },
    { symbol: "BNB", marketIndex: 5, marketId: 25 },
    { symbol: "AAVE", marketIndex: 6, marketId: 27 },
    { symbol: "XRP", marketIndex: 7, marketId: 7 },
    { symbol: "XMR", marketIndex: 8, marketId: 77 },
    { symbol: "ZEC", marketIndex: 9, marketId: 90 },
    { symbol: "FARTCOIN", marketIndex: 10, marketId: 21 },
    { symbol: "PUMP", marketIndex: 11, marketId: 45 },
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

// ============================================================================
// Full Timeframe Continuity (FTC) Types
// ============================================================================

// FTC Timeframes (8 total - 1w excluded due to API reliability issues)
export const FTC_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "12h", "1d"] as const;
export type FTCTimeframe = (typeof FTC_TIMEFRAMES)[number];

// Per-timeframe state wrapper (includes pattern + metadata)
export interface FTCStratState {
    pattern: string;              // e.g., "2-2 Continuation", "3-1-2U Breakout"
    direction: "bullish" | "bearish" | "neutral";
    patternType: StratPatternType; // Raw type: "1", "2U", "2D", "3"
    lastUpdated: number;          // Unix timestamp (milliseconds)
    stale: boolean;               // True if data exceeds acceptable staleness threshold
    error?: string;               // Optional error message if fetch/analysis failed
}

// Confluence metrics across all timeframes (mechanical facts only)
export interface MarketConfluence {
    bullishTimeframes: FTCTimeframe[]; // Timeframes showing bullish patterns (2U)
    bearishTimeframes: FTCTimeframe[]; // Timeframes showing bearish patterns (2D)
    totalTimeframes: number;           // Total timeframes analyzed (0-8)
}

// Multi-timeframe analysis for a single market
export interface MultiTimeframeAnalysis {
    marketId: number;
    symbol: string;
    // Partial record to handle partial failures gracefully
    timeframes: Partial<Record<FTCTimeframe, FTCStratState>>;
    confluence: MarketConfluence;
    lastUpdated: number; // Unix timestamp (milliseconds) - most recent update across all TFs
}

// FTC API response type
export type FTCResponse = MultiTimeframeAnalysis[];
