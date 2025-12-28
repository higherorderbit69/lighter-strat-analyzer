/**
 * FTC Service - Full Timeframe Continuity Analysis
 * Orchestrates multi-timeframe analysis with caching and rate limiting
 */

import type { Market, FTCTimeframe, FTCStratState, MarketConfluence, MultiTimeframeAnalysis, FTCResponse } from "@shared/types";
import { FTC_TIMEFRAMES } from "@shared/types";
import { fetchCandles, convertCandle } from "./lighterApi";
import { analyzeCandles } from "./stratAnalyzer";
import { globalRateLimiter } from "./rateLimiter";

// Cache entry with TTL
interface CacheEntry {
    data: FTCStratState;
    expiry: number; // Unix timestamp in milliseconds
}

// TTL in milliseconds per timeframe
const TTL_MAP: Record<FTCTimeframe, number> = {
    "1m": 30 * 1000,      // 30 seconds
    "5m": 2 * 60 * 1000,  // 2 minutes
    "15m": 5 * 60 * 1000, // 5 minutes
    "30m": 10 * 60 * 1000, // 10 minutes
    "1h": 15 * 60 * 1000, // 15 minutes
    "4h": 30 * 60 * 1000, // 30 minutes
    "12h": 2 * 60 * 60 * 1000,  // 2 hours
    "1d": 4 * 60 * 60 * 1000,   // 4 hours
};

// In-memory cache: "marketId:timeframe" -> CacheEntry
const cache = new Map<string, CacheEntry>();

/**
 * Get cache key for a market-timeframe pair
 */
function getCacheKey(marketId: number, timeframe: FTCTimeframe): string {
    return `${marketId}:${timeframe}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(entry: CacheEntry | undefined, now: number): boolean {
    if (!entry) return false;
    return entry.expiry > now;
}

/**
 * Fetch and analyze a single timeframe for a market
 */
async function fetchAndAnalyzeTF(
    marketId: number,
    timeframe: FTCTimeframe,
    candleCount: number = 20
): Promise<FTCStratState> {
    const now = Date.now();
    const cacheKey = getCacheKey(marketId, timeframe);

    // Check cache first
    const cached = cache.get(cacheKey);
    if (isCacheValid(cached, now)) {
        // Update stale flag based on TTL
        const ttl = TTL_MAP[timeframe];
        const age = now - (cached!.expiry - ttl);
        const isStale = age > ttl * 0.8; // Mark as stale if 80% through TTL

        return {
            ...cached!.data,
            stale: isStale,
        };
    }

    // Cache miss - fetch new data with rate limiting
    try {
        const rawCandles = await globalRateLimiter.execute(() =>
            fetchCandles(marketId, timeframe, candleCount)
        );

        const convertedCandles = rawCandles.map(convertCandle);
        const { candles, actionableSetup } = analyzeCandles(convertedCandles);

        if (candles.length === 0) {
            throw new Error("No candles returned from API");
        }

        const currentCandle = candles[candles.length - 1];

        const state: FTCStratState = {
            pattern: actionableSetup?.pattern || "No Setup",
            direction: actionableSetup?.direction || "neutral",
            patternType: currentCandle.patternType || "1",
            lastUpdated: now,
            stale: false,
        };

        // Cache with TTL
        const ttl = TTL_MAP[timeframe];
        cache.set(cacheKey, {
            data: state,
            expiry: now + ttl,
        });

        return state;
    } catch (error) {
        // Return error state instead of throwing
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
            pattern: "Error",
            direction: "neutral",
            patternType: "1",
            lastUpdated: now,
            stale: true,
            error: errorMessage,
        };
    }
}

/**
 * Calculate confluence metrics from timeframe states
 * 
 * MVP Rule: Only 2U counts as bullish and only 2D counts as bearish.
 * Inside bars (1) and outside bars (3) are treated as neutral and excluded from directional counts.
 */
export function calculateConfluence(
    timeframes: Partial<Record<FTCTimeframe, FTCStratState>>
): MarketConfluence {
    const bullishTimeframes: FTCTimeframe[] = [];
    const bearishTimeframes: FTCTimeframe[] = [];
    let totalTimeframes = 0;

    for (const tf of FTC_TIMEFRAMES) {
        const state = timeframes[tf];
        if (!state || state.error) {
            continue; // Skip failed/missing timeframes
        }

        totalTimeframes++;

        // Classify based on patternType (MVP: only 2U/2D are directional)
        if (state.patternType === "2U") {
            bullishTimeframes.push(tf);
        } else if (state.patternType === "2D") {
            bearishTimeframes.push(tf);
        }
        // Note: "1" (inside) and "3" (outside) are not counted as directional
    }

    return {
        bullishTimeframes,
        bearishTimeframes,
        totalTimeframes,
    };
}

/**
 * Analyze multiple markets across all FTC timeframes
 */
export async function analyzeMultipleMarketsFTC(
    markets: Market[],
    candleCount: number = 20
): Promise<FTCResponse> {
    const results: MultiTimeframeAnalysis[] = await Promise.all(
        markets.map(async (market) => {
            // Fetch all timeframes in parallel (rate limiter handles concurrency)
            const tfResults = await Promise.all(
                FTC_TIMEFRAMES.map(async (tf) => {
                    const state = await fetchAndAnalyzeTF(market.marketId, tf, candleCount);
                    return { tf, state };
                })
            );

            // Build timeframes map
            const timeframes: Partial<Record<FTCTimeframe, FTCStratState>> = {};
            let mostRecentUpdate = 0;

            for (const { tf, state } of tfResults) {
                timeframes[tf] = state;
                if (state.lastUpdated > mostRecentUpdate) {
                    mostRecentUpdate = state.lastUpdated;
                }
            }

            // Calculate confluence
            const confluence = calculateConfluence(timeframes);

            return {
                marketId: market.marketId,
                symbol: market.symbol,
                timeframes,
                confluence,
                lastUpdated: mostRecentUpdate,
            };
        })
    );

    return results;
}
